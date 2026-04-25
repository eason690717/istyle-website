import { prisma } from "@/lib/prisma";
import { updateBookingStatus } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];
const STATUS_LABEL: Record<string, string> = {
  PENDING: "待處理", CONFIRMED: "已確認", COMPLETED: "完成", CANCELLED: "取消", NO_SHOW: "未到",
};
const SERVICE_LABEL: Record<string, string> = {
  REPAIR: "維修", RECYCLE: "回收估價", DIAGNOSTIC: "檢測", COURSE_INQUIRY: "課程", GENERAL: "諮詢",
};

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  }).catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-[var(--gold)]">預約管理</h1>
        <div className="text-sm text-[var(--fg-muted)]">共 {bookings.length} 筆</div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        {bookings.length === 0 ? (
          <div className="bg-[var(--bg-elevated)] p-12 text-center text-sm text-[var(--fg-muted)]">
            尚無預約資料
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--bg-soft)] text-left text-xs text-[var(--gold)]">
              <tr>
                <th className="px-3 py-2 whitespace-nowrap">編號</th>
                <th className="px-3 py-2">服務</th>
                <th className="px-3 py-2">客戶</th>
                <th className="px-3 py-2">電話</th>
                <th className="px-3 py-2">預約時間</th>
                <th className="px-3 py-2">需求</th>
                <th className="px-3 py-2">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {bookings.map((b, i) => (
                <tr key={b.id} className={i % 2 === 0 ? "bg-[#141414]" : "bg-[#181818]"}>
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{b.bookingNumber}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{SERVICE_LABEL[b.serviceType]}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{b.contactName}</td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                    <a href={`tel:${b.contactPhone}`} className="hover:text-[var(--gold)]">{b.contactPhone}</a>
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {new Date(b.scheduledDate).toLocaleDateString("zh-TW")}
                    <br />
                    <span className="text-[var(--gold-soft)]">{b.scheduledTime}</span>
                  </td>
                  <td className="px-3 py-2 text-xs max-w-md">
                    <div className="line-clamp-3">{b.description}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <form action={updateBookingStatus.bind(null, b.id)}>
                      <select
                        name="status"
                        defaultValue={b.status}
                        className="rounded border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--fg)] focus:border-[var(--gold)]"
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                      <button type="submit" className="ml-2 text-xs text-[var(--gold)] hover:text-[var(--gold-bright)]">
                        儲存
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
