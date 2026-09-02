"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyOwner } from "@/lib/notify";
import { revalidatePath } from "next/cache";

const SERVICE_TYPES = ["REPAIR", "RECYCLE", "DIAGNOSTIC", "COURSE_INQUIRY", "GENERAL"] as const;
const SERVICE_LABELS: Record<typeof SERVICE_TYPES[number], string> = {
  REPAIR: "維修",
  RECYCLE: "二手機回收估價",
  DIAGNOSTIC: "手機檢測",
  COURSE_INQUIRY: "維修課程諮詢",
  GENERAL: "一般諮詢",
};

const Schema = z.object({
  serviceType: z.enum(SERVICE_TYPES),
  contactName: z.string().min(1, "請填姓名").max(50),
  contactPhone: z.string().regex(/^09\d{8}$|^0\d{8,9}$/, "請填正確電話格式"),
  description: z.string().min(1, "請描述需求").max(1000),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
});

export type BookingFormState = {
  ok: boolean;
  message?: string;
  bookingNumber?: string;
  errors?: Record<string, string>;
};

function genBookingNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rnd = Math.floor(100 + Math.random() * 900);
  return `B${y}${m}${day}${rnd}`;
}

export async function submitBooking(_prev: BookingFormState, fd: FormData): Promise<BookingFormState> {
  const raw = {
    serviceType: fd.get("serviceType")?.toString() || "REPAIR",
    contactName: fd.get("contactName")?.toString().trim() || "",
    contactPhone: fd.get("contactPhone")?.toString().trim() || "",
    description: fd.get("description")?.toString().trim() || "",
    scheduledDate: fd.get("scheduledDate")?.toString() || "",
    scheduledTime: fd.get("scheduledTime")?.toString() || "",
  };
  const parsed = Schema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, errors, message: "請檢查表單欄位" };
  }
  const data = parsed.data;

  try {
    const bookingNumber = genBookingNumber();
    const dateOnly = data.scheduledDate
      ? new Date(data.scheduledDate + "T00:00:00+08:00")
      : new Date();
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        serviceType: data.serviceType,
        description: data.description,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        scheduledDate: dateOnly,
        scheduledTime: data.scheduledTime || "待確認",
        status: "PENDING",
      },
    });

    const msg = [
      "🔔 新預約",
      `編號：${booking.bookingNumber}`,
      `服務：${SERVICE_LABELS[data.serviceType]}`,
      `姓名：${data.contactName}`,
      `電話：${data.contactPhone}`,
      data.scheduledDate ? `日期：${data.scheduledDate} ${data.scheduledTime || ""}` : "時段：待確認",
      `需求：${data.description}`,
    ].filter(Boolean).join("\n");
    notifyOwner(msg).catch(console.error);

    revalidatePath("/booking");
    return { ok: true, bookingNumber: booking.bookingNumber, message: "預約已送出，我們將盡快聯絡您" };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "系統忙碌中，請改用 LINE 或電話聯絡" };
  }
}
