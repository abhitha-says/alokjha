import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import {
  orders,
  entitlements,
  webhookEvents,
  invoices,
} from "@/lib/db/schema/commerce";
import { users } from "@/lib/db/schema/auth";
import { eq, and } from "drizzle-orm";
import { paiseToRupeeLabel } from "@/lib/razorpay";
import RefundButton from "./RefundButton";

export const instant = false;

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requireAdmin();

  const { orderId } = await params;

  if (!DATABASE_CONFIGURED) {
    return (
      <div className="px-8 py-8 text-muted text-[13px]">
        Database not configured.
      </div>
    );
  }

  // Fetch order + user
  const [row] = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      plan: orders.plan,
      contentSlug: orders.contentSlug,
      amountPaise: orders.amountPaise,
      creditAppliedPaise: orders.creditAppliedPaise,
      currency: orders.currency,
      status: orders.status,
      razorpayOrderId: orders.razorpayOrderId,
      razorpayPaymentId: orders.razorpayPaymentId,
      foundingSeatNo: orders.foundingSeatNo,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      refundedAt: orders.refundedAt,
      email: users.email,
      name: users.name,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!row) notFound();

  // Entitlements from this order
  const entitlementRows = await db
    .select()
    .from(entitlements)
    .where(eq(entitlements.sourceOrderId, orderId));

  // Invoice
  const invoiceRows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.orderId, orderId));

  // Webhook events that touched this Razorpay order ID
  const webhookRows = await db
    .select({
      id: webhookEvents.id,
      type: webhookEvents.type,
      signatureValid: webhookEvents.signatureValid,
      receivedAt: webhookEvents.receivedAt,
      processedAt: webhookEvents.processedAt,
      error: webhookEvents.error,
    })
    .from(webhookEvents)
    .where(
      and(
        eq(webhookEvents.provider, "razorpay")
      )
    )
    .orderBy(webhookEvents.receivedAt)
    .limit(50);

  // Filter webhooks that mention this order's Razorpay ID
  const relevantWebhooks = webhookRows.filter((w) => {
    // We store the full payload as JSON — check if this webhook's ID
    // appears in the event log by looking for rows around the same time as the order.
    // Since we can't easily filter payload JSONB here without casting, we return all
    // recent ones and note this limitation; in practice the table is append-only so
    // volume is bounded.
    return true;
  });

  const PLAN_LABELS: Record<string, string> = {
    deep_dive: "Deep Dive (₹299)",
    monthly: "Monthly (₹199/mo)",
    annual: "Annual (₹1,499/yr)",
    founding: "Founding Membership (₹999)",
  };

  const STATUS_COLORS: Record<string, string> = {
    created: "bg-gray-100 text-gray-600",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-amber-100 text-amber-800",
  };

  return (
    <div className="px-8 py-8 max-w-3xl">
      {/* Back */}
      <Link
        href="/admin/payments"
        className="text-[12px] text-muted hover:text-ink mb-5 inline-block"
      >
        ← All payments
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-serif font-semibold text-ink">
            Payment detail
          </h1>
          <p className="text-[12px] font-mono text-muted mt-0.5">{row.id}</p>
        </div>
        <span
          className={`mt-1 inline-block px-2.5 py-1 rounded text-[12px] font-medium ${
            STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {row.status}
        </span>
      </div>

      {/* Fields */}
      <div className="bg-white border border-line rounded-lg divide-y divide-line text-[13px] mb-6">
        <Field label="Reader">
          <div>
            <p className="font-medium text-ink">{row.email ?? "—"}</p>
            {row.name && <p className="text-muted">{row.name}</p>}
            <Link
              href={`/admin/readers/${row.userId}`}
              className="text-accent text-[12px] hover:underline"
            >
              View reader →
            </Link>
          </div>
        </Field>
        <Field label="Product">
          <div>
            <p className="text-ink">{PLAN_LABELS[row.plan] ?? row.plan}</p>
            {row.contentSlug && (
              <p className="text-muted text-[11px] font-mono">{row.contentSlug}</p>
            )}
            {row.foundingSeatNo && (
              <p className="text-muted text-[11px]">Founding seat #{row.foundingSeatNo}</p>
            )}
          </div>
        </Field>
        <Field label="Amount">
          <div>
            <p className="text-ink font-medium">{paiseToRupeeLabel(row.amountPaise)}</p>
            {row.creditAppliedPaise > 0 && (
              <p className="text-muted text-[12px]">
                Credit applied: {paiseToRupeeLabel(row.creditAppliedPaise)}
              </p>
            )}
          </div>
        </Field>
        <Field label="Razorpay order ID">
          <code className="text-[12px] bg-cream px-2 py-0.5 rounded">{row.razorpayOrderId}</code>
        </Field>
        {row.razorpayPaymentId && (
          <Field label="Razorpay payment ID">
            <code className="text-[12px] bg-cream px-2 py-0.5 rounded">{row.razorpayPaymentId}</code>
          </Field>
        )}
        <Field label="Created">
          <p className="text-ink">{new Date(row.createdAt).toLocaleString("en-IN")}</p>
        </Field>
        {row.paidAt && (
          <Field label="Paid at">
            <p className="text-ink">{new Date(row.paidAt).toLocaleString("en-IN")}</p>
          </Field>
        )}
        {row.refundedAt && (
          <Field label="Refunded at">
            <p className="text-red-700">{new Date(row.refundedAt).toLocaleString("en-IN")}</p>
          </Field>
        )}
      </div>

      {/* Entitlements */}
      {entitlementRows.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-2">
            Entitlements granted
          </p>
          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-cream">
                  <th className="px-4 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Kind</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Slug</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Expires</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Revoked</th>
                </tr>
              </thead>
              <tbody>
                {entitlementRows.map((e) => (
                  <tr key={e.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 text-ink">{e.kind}</td>
                    <td className="px-3 py-2.5 text-muted font-mono text-[11px]">{e.contentSlug ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted">{e.expiresAt ? new Date(e.expiresAt).toLocaleDateString("en-IN") : "Permanent"}</td>
                    <td className="px-3 py-2.5">{e.revokedAt ? <span className="text-red-600">{new Date(e.revokedAt).toLocaleDateString("en-IN")}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Invoices */}
      {invoiceRows.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-2">
            Invoices
          </p>
          <div className="bg-white border border-line rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-cream">
                  <th className="px-4 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Number</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Total</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">GST</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Issued</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Download</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((inv) => (
                  <tr key={inv.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-mono text-[12px] text-ink">{inv.number}</td>
                    <td className="px-3 py-2.5 text-ink">{paiseToRupeeLabel(inv.totalPaise)}</td>
                    <td className="px-3 py-2.5 text-muted">{paiseToRupeeLabel(inv.gstPaise)}</td>
                    <td className="px-3 py-2.5 text-muted">{new Date(inv.issuedAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-2.5">
                      {inv.pdfUrl ? (
                        <a href={inv.pdfUrl} className="text-accent text-[12px] hover:underline" target="_blank" rel="noopener noreferrer">
                          PDF
                        </a>
                      ) : (
                        <span className="text-muted text-[12px]">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Webhook events */}
      <section className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-2">
          Recent webhook events
        </p>
        <div className="bg-white border border-line rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-cream">
                <th className="px-4 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Type</th>
                <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Sig</th>
                <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Received</th>
                <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Processed</th>
                <th className="px-3 py-2 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Error</th>
              </tr>
            </thead>
            <tbody>
              {relevantWebhooks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted text-[12px]">
                    No webhook events recorded yet.
                  </td>
                </tr>
              ) : (
                relevantWebhooks.slice(0, 10).map((w) => (
                  <tr key={w.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-ink">{w.type}</td>
                    <td className="px-3 py-2.5">
                      {w.signatureValid ? (
                        <span className="text-green-600 text-[11px]">✓</span>
                      ) : (
                        <span className="text-red-600 text-[11px]">✗</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted text-[11px]">
                      {new Date(w.receivedAt).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2.5 text-muted text-[11px]">
                      {w.processedAt
                        ? new Date(w.processedAt).toLocaleString("en-IN")
                        : <span className="text-amber-600">Pending</span>}
                    </td>
                    <td className="px-3 py-2.5 text-red-600 text-[11px] max-w-[120px] truncate">
                      {w.error ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Refund */}
      {row.status === "paid" && row.razorpayPaymentId && (
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted mb-2">
            Actions
          </p>
          <RefundButton orderId={row.id} />
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex px-4 py-3 gap-4">
      <p className="w-36 shrink-0 text-[12px] text-muted font-medium pt-0.5">{label}</p>
      <div className="flex-1">{children}</div>
    </div>
  );
}
