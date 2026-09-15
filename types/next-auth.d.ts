import type { DefaultSession } from "next-auth";

/**
 * Adds `id` and `role` to the session user.
 *
 * Without this, `session.user.role` is a type error at every call site that
 * needs it — which is every admin guard in Phase 3.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "reader" | "editor" | "admin";
    } & DefaultSession["user"];
  }
}
