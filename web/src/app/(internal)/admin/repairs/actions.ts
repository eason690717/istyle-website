"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function genTicketNumber(): string {
  // R26 + YMMDD + 2 random
  const d = new Date();
  const ymd = `${d.getFullYear().toString().slice(-2)}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`;
  const r = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `R${ymd}${r}`;
}

export async function createTicket(args: {
  customerName: string;
  phoneLast4: string;
  deviceModel: string;
  issueDescription: string;
  estimatedCost?: number;
}) {
  const ticketNumber = genTicketNumber();
  const t = await prisma.repairTicket.create({
    data: {
      ticketNumber,
      customerName: args.customerName.trim(),
      phoneLast4: args.phoneLast4.trim().slice(-4),
      deviceModel: args.deviceModel.trim(),
      issueDescription: args.issueDescription.trim(),
      estimatedCost: args.estimatedCost ?? null,
      timeline: JSON.stringify([{
        at: new Date().toISOString(),
        status: "RECEIVED",
        note: "已收到您的裝置，我們會盡快檢測",
      }]),
    },
  });
  revalidatePath("/admin/repairs");
  redirect(`/admin/repairs/${t.id}`);
}

export async function updateTicketStatus(args: {
  id: number;
  status: string;
  note?: string;
  photos?: string[];
  estimatedCost?: number | null;
  finalCost?: number | null;
  internalNotes?: string;
}) {
  const t = await prisma.repairTicket.findUnique({ where: { id: args.id } });
  if (!t) return { ok: false };

  let timeline: Array<Record<string, unknown>> = [];
  try { timeline = JSON.parse(t.timeline); } catch { timeline = []; }

  // 狀態變更或有 note/photos → 加新一筆
  const statusChanged = args.status !== t.status;
  if (statusChanged || args.note || (args.photos && args.photos.length > 0)) {
    timeline.push({
      at: new Date().toISOString(),
      status: args.status,
      note: args.note || undefined,
      photos: args.photos && args.photos.length > 0 ? args.photos : undefined,
    });
  }

  await prisma.repairTicket.update({
    where: { id: args.id },
    data: {
      status: args.status,
      timeline: JSON.stringify(timeline),
      estimatedCost: args.estimatedCost !== undefined ? args.estimatedCost : t.estimatedCost,
      finalCost: args.finalCost !== undefined ? args.finalCost : t.finalCost,
      internalNotes: args.internalNotes !== undefined ? args.internalNotes : t.internalNotes,
      pickedUpAt: args.status === "PICKED_UP" ? new Date() : t.pickedUpAt,
    },
  });
  revalidatePath(`/admin/repairs/${args.id}`);
  revalidatePath("/admin/repairs");
  return { ok: true };
}

export async function deleteTicket(id: number) {
  await prisma.repairTicket.delete({ where: { id } });
  revalidatePath("/admin/repairs");
  redirect("/admin/repairs");
}
