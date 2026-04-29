"use server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { POS_COOKIE, verifyStaffSession } from "@/lib/pos-auth";
import { issueInvoice } from "@/lib/ecpay/invoice";

interface SaleItemInput {
  itemType: "PRODUCT" | "VARIANT" | "REPAIR" | "CUSTOM";
  productId?: number;
  productVariantId?: number;
  repairPriceId?: number;
  name: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  serial?: string;
  productSerialId?: number;
}

function genSaleNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear().toString().slice(-2)}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`;
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `S${ymd}${r}`;
}

export async function createSale(args: {
  items: SaleItemInput[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
}): Promise<{ ok: boolean; saleId?: number; error?: string }> {
  // 驗證 staff
  const cs = await cookies();
  const tok = cs.get(POS_COOKIE)?.value;
  const staff = await verifyStaffSession(tok);
  if (!staff) return { ok: false, error: "請重新登入" };

  if (args.items.length === 0) return { ok: false, error: "購物車空" };
  if (args.total < 0) return { ok: false, error: "金額不對" };

  // 一次 transaction：建 Sale + items，並扣庫存
  try {
    const sale = await prisma.$transaction(async (tx) => {
      // 庫存檢查 + 預扣 + 記 StockMovement
      for (const it of args.items) {
        if (it.itemType === "PRODUCT" && it.productId) {
          const p = await tx.product.findUnique({ where: { id: it.productId } });
          if (!p) throw new Error(`商品 ${it.name} 不存在`);
          if (p.stock < it.qty) throw new Error(`商品 ${it.name} 庫存不足（剩 ${p.stock}）`);
          const newStock = p.stock - it.qty;
          await tx.product.update({ where: { id: it.productId }, data: { stock: newStock } });
          await tx.stockMovement.create({
            data: {
              type: "SALE",
              productId: it.productId,
              qty: -it.qty,
              prevStock: p.stock,
              newStock,
              staffId: staff.staffId,
              reason: `POS 銷售`,
            },
          });
        } else if (it.itemType === "VARIANT" && it.productVariantId) {
          const v = await tx.productVariant.findUnique({ where: { id: it.productVariantId } });
          if (!v) throw new Error(`規格 ${it.name} 不存在`);
          if (v.stock < it.qty) throw new Error(`${it.name} 庫存不足（剩 ${v.stock}）`);
          const newStock = v.stock - it.qty;
          await tx.productVariant.update({ where: { id: it.productVariantId }, data: { stock: newStock } });
          await tx.stockMovement.create({
            data: {
              type: "SALE",
              productVariantId: it.productVariantId,
              qty: -it.qty,
              prevStock: v.stock,
              newStock,
              staffId: staff.staffId,
              reason: `POS 銷售`,
            },
          });
        }
        // REPAIR / CUSTOM 不扣庫存
      }

      // 建 Sale
      const sale = await tx.sale.create({
        data: {
          saleNumber: genSaleNumber(),
          staffId: staff.staffId,
          customerName: args.customerName || null,
          customerPhone: args.customerPhone || null,
          subtotal: args.subtotal,
          discount: args.discount,
          total: args.total,
          paymentMethod: args.paymentMethod,
          paymentStatus: "PAID",
          paidAt: new Date(),
          notes: args.notes || null,
          items: {
            create: args.items.map(it => ({
              itemType: it.itemType,
              productId: it.productId ?? null,
              productVariantId: it.productVariantId ?? null,
              repairPriceId: it.repairPriceId ?? null,
              name: it.name,
              sku: it.sku ?? null,
              serial: it.serial ?? null,
              qty: it.qty,
              unitPrice: it.unitPrice,
              lineTotal: it.unitPrice * it.qty,
            })),
          },
        },
      });
      // === 序號商品：把對應 ProductSerial 標記 SOLD ===
      for (const it of args.items) {
        if (it.productSerialId) {
          await tx.productSerial.update({
            where: { id: it.productSerialId },
            data: {
              status: "SOLD",
              soldAt: new Date(),
              saleId: sale.id,
            },
          });
        }
      }

      return sale;
    });

    // === 自動開立電子發票（綠界 B2C，失敗不擋結帳）===
    if (args.total > 0) {
      try {
        const inv = await issueInvoice({
          relateNumber: sale.saleNumber,
          customerName: args.customerName || "",
          customerPhone: args.customerPhone || "",
          items: args.items.map(it => ({
            ItemName: it.name.slice(0, 100),
            ItemCount: it.qty,
            ItemWord: "件",
            ItemPrice: it.unitPrice,
            ItemTaxType: 1 as const,
            ItemAmount: it.unitPrice * it.qty,
          })),
          totalAmount: args.total,
        });
        if (inv.ok && inv.invoiceNumber) {
          await prisma.sale.update({
            where: { id: sale.id },
            data: { invoiceNumber: inv.invoiceNumber, invoiceIssuedAt: new Date() },
          });
        } else {
          console.error("[pos/invoice] failed:", inv.error);
        }
      } catch (e) {
        console.error("[pos/invoice] exception", e);
      }
    }

    return { ok: true, saleId: sale.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function voidSale(saleId: number, reason: string) {
  const cs = await cookies();
  const tok = cs.get(POS_COOKIE)?.value;
  const staff = await verifyStaffSession(tok);
  if (!staff) return { ok: false, error: "請重新登入" };
  if (staff.role !== "MANAGER") return { ok: false, error: "僅店長可作廢" };

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
      if (!sale) throw new Error("找不到交易");
      if (sale.paymentStatus === "VOID") throw new Error("已作廢");

      // 序號還原（SOLD → IN_STOCK）
      await tx.productSerial.updateMany({
        where: { saleId },
        data: { status: "IN_STOCK", soldAt: null, saleId: null },
      });

      // 庫存還原 + 記 StockMovement RETURN
      for (const it of sale.items) {
        if (it.itemType === "PRODUCT" && it.productId) {
          const p = await tx.product.findUnique({ where: { id: it.productId } });
          if (!p) continue;
          const newStock = p.stock + it.qty;
          await tx.product.update({ where: { id: it.productId }, data: { stock: newStock } });
          await tx.stockMovement.create({
            data: {
              type: "RETURN",
              productId: it.productId,
              qty: it.qty,
              prevStock: p.stock,
              newStock,
              staffId: staff.staffId,
              reason: `POS 作廢: ${reason}`,
            },
          });
        } else if (it.itemType === "VARIANT" && it.productVariantId) {
          const v = await tx.productVariant.findUnique({ where: { id: it.productVariantId } });
          if (!v) continue;
          const newStock = v.stock + it.qty;
          await tx.productVariant.update({ where: { id: it.productVariantId }, data: { stock: newStock } });
          await tx.stockMovement.create({
            data: {
              type: "RETURN",
              productVariantId: it.productVariantId,
              qty: it.qty,
              prevStock: v.stock,
              newStock,
              staffId: staff.staffId,
              reason: `POS 作廢: ${reason}`,
            },
          });
        }
      }

      await tx.sale.update({
        where: { id: saleId },
        data: { paymentStatus: "VOID", voidedAt: new Date(), voidReason: reason },
      });
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
