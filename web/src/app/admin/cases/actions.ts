"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function generateSlug(title: string): string {
  // ASCII-only slug — 中文 slug 會在 Next.js 16 dynamic route 404
  const ts = Date.now().toString(36);
  // 簡單 transliterate：取 title 前幾個 ASCII 字 + timestamp
  const ascii = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return ascii ? `${ascii}-${ts}` : `case-${ts}`;
}

export async function createCase(args: {
  title: string;
  brand: string;
  deviceModel: string;
  issueType: string;
  description: string;
  beforePhotos: string[];
  afterPhotos: string[];
  repairMinutes?: number;
  cost?: number;
  customerInitial?: string;
}) {
  const slug = generateSlug(args.title);
  const c = await prisma.caseStudy.create({
    data: {
      slug,
      title: args.title.trim(),
      brand: args.brand.trim(),
      deviceModel: args.deviceModel.trim(),
      issueType: args.issueType.trim(),
      description: args.description,
      beforePhotos: JSON.stringify(args.beforePhotos),
      afterPhotos: JSON.stringify(args.afterPhotos),
      repairMinutes: args.repairMinutes ?? null,
      cost: args.cost ?? null,
      customerInitial: args.customerInitial?.trim() || null,
    },
  });
  revalidatePath("/cases");
  revalidatePath("/admin/cases");
  redirect(`/admin/cases/${c.id}`);
}

export async function updateCase(args: {
  id: number;
  title: string;
  brand: string;
  deviceModel: string;
  issueType: string;
  description: string;
  beforePhotos: string[];
  afterPhotos: string[];
  repairMinutes?: number | null;
  cost?: number | null;
  customerInitial?: string | null;
  isPublished: boolean;
}) {
  await prisma.caseStudy.update({
    where: { id: args.id },
    data: {
      title: args.title.trim(),
      brand: args.brand.trim(),
      deviceModel: args.deviceModel.trim(),
      issueType: args.issueType.trim(),
      description: args.description,
      beforePhotos: JSON.stringify(args.beforePhotos),
      afterPhotos: JSON.stringify(args.afterPhotos),
      repairMinutes: args.repairMinutes ?? null,
      cost: args.cost ?? null,
      customerInitial: args.customerInitial || null,
      isPublished: args.isPublished,
    },
  });
  revalidatePath("/cases");
  revalidatePath(`/admin/cases/${args.id}`);
  return { ok: true };
}

export async function deleteCase(id: number) {
  await prisma.caseStudy.delete({ where: { id } });
  revalidatePath("/cases");
  revalidatePath("/admin/cases");
  redirect("/admin/cases");
}
