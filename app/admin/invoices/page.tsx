import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { invoices, orders } from "@/lib/db/schema/commerce";
import { users } from "@/lib/db/schema/auth";
import { eq, desc } from "drizzle-orm";
import { paiseToRupeeLabel } from "@/lib/razorpay";

export const instant = false;

export default async function InvoicesPage() {
  await requireAdmin();

  if (!DATABASE_CONFIGURED) {
    return (
      <div className="px-8 py-8 text-muted text-[13px]">
        Database not configured.
      </div>
    );
  }

  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      subtotalPaise: invoices.subtotalPaise,
      gstPaise: invoices.gstPaise,
      totalPaise: invoices.totalPaise,
      pdfUrl: invoices.pdfUrl,
      issuedAt: invoices.issuedAt,
      orderId: invoices.orderId,
      email: users.email,
    })
    .from(invoices)
    .leftJoin(orders, eq(invoices.orderId, orders.id))
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(invoices.issuedAt))
    .limit(200);

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-serif font-semibold text-ink">Invoices</h1>
        <p className="text-[13px] text-muted mt-0.5">{rows.length} recent invoices</p>
      </div>

      <div className="bg-white border border-line rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-cream">
              <th className="px-4 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Number</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Reader</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Subtotal</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">GST</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Total</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Issued</th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">PDF</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted text-[13px]">
                  No invoices yet.
                </td>
              </tr>
            ) : (
              rows.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-line last:border-0 hover:bg-cream/40 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-[12px] text-ink">
                    {inv.orderId ? (
                      <Link href={`/admin/payments/${inv.orderId}`} className="hover:text-accent">
                        {inv.number}
                      </Link>
                    ) : (
                      inv.number
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted text-[12px]">{inv.email ?? "—"}</td>
                  <td className="px-3 py-3 text-ink">{paiseToRupeeLabel(inv.subtotalPaise)}</td>
                  <td className="px-3 py-3 text-muted">{paiseToRupeeLabel(inv.gstPaise)}</td>
                  <td className="px-3 py-3 font-medium text-ink">{paiseToRupeeLabel(inv.totalPaise)}</td>
                  <td className="px-3 py-3 text-muted">
                    {new Date(inv.issuedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-3">
                    {inv.pdfUrl ? (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent text-[12px] hover:underline"
                      >
                        Download
                      </a>
                    ) : (
                      <span className="text-muted text-[12px]">Pending</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
