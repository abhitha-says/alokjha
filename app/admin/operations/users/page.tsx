import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { db, DATABASE_CONFIGURED } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import { isNull, ne, desc } from "drizzle-orm";
import UpdateRoleForm from "./UpdateRoleForm";

export const instant = false;

export default async function AdminUsersPage() {
  await requireAdmin();

  if (!DATABASE_CONFIGURED) {
    return <div className="px-8 py-8 text-muted text-[13px]">Database not configured.</div>;
  }

  const adminUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
      totpConfirmedAt: users.totpConfirmedAt,
    })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(desc(users.createdAt))
    .limit(200);

  const staffUsers = adminUsers.filter((u) => u.role === "admin" || u.role === "editor");

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[22px] font-serif font-semibold text-ink">Admin users</h1>
        <p className="text-[13px] text-muted mt-0.5">
          Admins have full access including refunds and entitlement grants. Editors can only manage content.
        </p>
      </div>

      {staffUsers.length === 0 ? (
        <div className="bg-white border border-line rounded-lg px-5 py-8 text-center text-muted text-[13px]">
          No admin or editor accounts found.
        </div>
      ) : (
        <div className="bg-white border border-line rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-cream">
                <th className="px-4 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">User</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Role</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">TOTP</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Last seen</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted text-[11px] uppercase tracking-[0.08em]">Change role</th>
              </tr>
            </thead>
            <tbody>
              {staffUsers.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/readers/${u.id}`} className="text-ink hover:text-accent font-medium">
                      {u.email}
                    </Link>
                    {u.name && <p className="text-muted text-[11px]">{u.name}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                      u.role === "admin" ? "bg-ink text-white" : "bg-cream border border-line text-muted"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {u.role === "admin" ? (
                      u.totpConfirmedAt ? (
                        <span className="text-green-600 text-[12px]">✓ Enrolled</span>
                      ) : (
                        <span className="text-red-600 text-[12px]">✗ Not set</span>
                      )
                    ) : (
                      <span className="text-muted text-[12px]">N/A</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted text-[12px]">
                    {u.lastSeenAt
                      ? new Date(u.lastSeenAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <UpdateRoleForm userId={u.id} currentRole={u.role} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
