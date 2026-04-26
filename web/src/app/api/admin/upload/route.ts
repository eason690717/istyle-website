// 後台檔案上傳：Vercel Blob 儲存
// 需要 Vercel env: BLOB_READ_WRITE_TOKEN（在 Vercel Dashboard 開 Blob 後自動加）
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  // 後台保護
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const ok = await verifySession(token);
  if (!ok) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "無檔案" }, { status: 400 });

  // 驗證
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `檔案過大（限 ${MAX_SIZE / 1024 / 1024}MB）` }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "僅支援 JPG / PNG / WebP / GIF" }, { status: 400 });
  }

  // 產生 unique 檔名（保留副檔名）
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  try {
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url, size: file.size });
  } catch (e) {
    console.error("[upload] error", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/BLOB_READ_WRITE_TOKEN|missing token/i.test(msg)) {
      return NextResponse.json(
        { error: "Vercel Blob 未啟用：請至 Vercel Dashboard → Storage → 建立 Blob store" },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
