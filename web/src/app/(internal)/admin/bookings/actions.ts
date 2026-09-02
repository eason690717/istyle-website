"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateBookingStatus(bookingId: number, fd: FormData) {
  const status = fd.get("status")?.toString();
  if (!status) return;
  const data: { status: string; confirmedAt?: Date; completedAt?: Date } = { status };
  if (status === "CONFIRMED") data.confirmedAt = new Date();
  if (status === "COMPLETED") data.completedAt = new Date();
  await prisma.booking.update({ where: { id: bookingId }, data });
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}
