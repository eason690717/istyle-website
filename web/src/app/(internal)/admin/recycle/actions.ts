"use server";
import { refreshRecyclePrices } from "@/lib/recycle/aggregate";
import { revalidatePath } from "next/cache";

export async function triggerRefresh() {
  await refreshRecyclePrices();
  revalidatePath("/admin/recycle");
  revalidatePath("/recycle");
}
