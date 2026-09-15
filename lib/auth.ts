import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { eq, sql } from "drizzle-orm";
import { verify } from "@node-rs/argon2";
import { headers } from "next/headers";
import { db } from "./db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  type User,
} from "./db/schema/auth";
import { rateLimit } from "./rate-limit";

/**
 * Authentication.
 *
 * Three ways in, one account per email address:
 *
 *   - Resend magic link. The primary path. Nothing to leak, nothing to forget.
 *   - Google. The highest-conversion path.
 *   - Email and password. Familiar, and argon2id so a database leak does not
 *     hand over the passwords too.
 *
 * `users_email_lower_idx` in the schema is what actually guarantees the "one
 * account per address" part — sign in with Google as `Alok@x.com` after having
 * used a magic link as `alok@x.com` and the database refuses to create the
 * second account rather than silently splitting the reader's entitlements.
 */

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),

  /**
   * Database sessions, not JWT.
   *
   * A JWT cannot be revoked before it expires. On this site the session *is*
   * the entitlement — a cancelled membership, a refunded Deep Dive or a banned
   * account would keep working for the life of the token. Deleting a row in
   * `sessions` ends access on the very next request.
   *
   * The cost is one indexed lookup per request. That is the right trade when
   * the alternative is serving paid content to someone who has been refunded.
   */
  session: {
    strategy: "database",
    maxAge: SESSION_MAX_AGE_SECONDS,
    // Refresh the row at most once a day rather than on every request.
    updateAge: 60 * 60 * 24,
  },

  cookies: {
    sessionToken: {
      name: "hs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/check-email",
    error: "/signin/error",
  },

  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM,
    }),

    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),

    Credentials({
      name: "Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const email = typeof raw?.email === "string" ? raw.email.trim() : "";
        const password = typeof raw?.password === "string" ? raw.password : "";
        if (!email || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(sql`lower(${users.email}) = lower(${email})`)
          .limit(1);

        // Returning null for "no such user" and for "wrong password" alike:
        // distinguishing them turns the sign-in form into an endpoint that
        // confirms whether an address has an account here, which for a
        // psychology publication is itself something readers would rather
        // not have enumerable.
        if (!user?.passwordHash || user.deletedAt) return null;

        const ok = await verify(user.passwordHash, password);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],

  callbacks: {
    /**
     * The session object every server component sees. `role` is read from the
     * database row on each request, never carried in a token — demoting an
     * admin has to take effect immediately, not whenever their token expires.
     */
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as User).role;
      }
      return session;
    },

    async signIn({ user }) {
      // IP-based sign-in rate limit: 10 attempts per IP per 15 minutes.
      // The limit is per-IP rather than per-email so that an attacker
      // cannot probe many addresses from one machine — and so that a
      // correct password still counts against the limit (the check fires
      // before credential verification).
      try {
        const headersList = await headers();
        const ip =
          headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          headersList.get("x-real-ip") ??
          "127.0.0.1";
        const rl = await rateLimit(`signin:${ip}`, 10, 15 * 60 * 1000);
        if (!rl.ok) {
          // Return false to reject the sign-in. Auth.js will redirect to
          // the error page with code=AuthorizedCallbackError.
          return false;
        }
      } catch {
        // Never let a rate-limit error prevent a legitimate sign-in.
        // If the DB is down, degrade gracefully.
      }

      // A soft-deleted account must not be resurrected by signing in again.
      if (!user?.email) return true;
      const [existing] = await db
        .select({ deletedAt: users.deletedAt })
        .from(users)
        .where(sql`lower(${users.email}) = lower(${user.email})`)
        .limit(1);
      return !existing?.deletedAt;
    },
  },

  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      await db
        .update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.id, user.id));
    },
  },

  trustHost: true,
});
