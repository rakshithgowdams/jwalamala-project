import { cache } from "react";
import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getServerClient } from "@/lib/supabase/server";
import { deskBase, loginPath } from "./paths";

type DeskProfile = {
  id: string;
  role: string;
  full_name: string | null;
  admin_sections: string[] | null;
};

/** Cross-request cache so sidebar clicks do not re-query profiles every time. */
const PROFILE_TTL_MS = 60_000;
const profileCache = new Map<string, { at: number; profile: DeskProfile }>();

export function invalidateDeskProfile(userId: string) {
  profileCache.delete(userId);
}

/** Public desk root from middleware (`/staff` or `/admin`), else role default. */
async function requestDeskBase(role?: string | null) {
  const header = (await headers()).get("x-desk-base");
  if (header === "/staff" || header === "/admin") return header;
  return deskBase(role);
}

function sessionStillFresh(expiresAt: number | undefined) {
  if (typeof expiresAt !== "number") return false;
  const expMs = expiresAt > 1e12 ? expiresAt : expiresAt * 1000;
  return expMs > Date.now() + 20_000;
}

function readCachedProfile(userId: string) {
  const hit = profileCache.get(userId);
  if (!hit) return null;
  if (Date.now() - hit.at > PROFILE_TTL_MS) {
    profileCache.delete(userId);
    return null;
  }
  return hit.profile;
}

function writeCachedProfile(profile: DeskProfile) {
  if (profileCache.size > 500) profileCache.clear();
  profileCache.set(profile.id, { at: Date.now(), profile });
}

/** Shared for the layout and the page, so one visit does not sign in twice. */
export const requireUser = cache(async (next = "/admin") => {
  const db = await getServerClient();
  if (!db) redirect(loginPath(next));

  // Cookie session only — avoid Auth network on every nav click.
  const {
    data: { session },
  } = await db.auth.getSession();
  if (session?.user && sessionStillFresh(session.expires_at)) {
    return { db, user: session.user as User };
  }

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(loginPath(next));
  return { db, user };
});

export const requireStaff = cache(async () => {
  const desk = await requestDeskBase();
  const { db, user } = await requireUser(desk);

  const cached = readCachedProfile(user.id);
  if (cached) {
    const role = String(cached.role);
    if (role === "admin" || role === "staff") return { db, user, profile: cached };
  }

  const { data: profile } = await db
    .from("profiles")
    .select("id,role,full_name,admin_sections")
    .eq("id", user.id)
    .single();
  if (!profile) notFound();

  const deskProfile: DeskProfile = {
    id: String(profile.id),
    role: String(profile.role),
    full_name: (profile.full_name as string | null) ?? null,
    admin_sections: (profile.admin_sections as string[] | null) ?? null,
  };
  writeCachedProfile(deskProfile);

  const role = deskProfile.role;
  if (role === "admin" || role === "staff") {
    return { db, user, profile: deskProfile };
  }

  const { data: allowed } = await db.rpc("has_permission", { requested: "admin.access" });
  if (allowed !== true) redirect(loginPath(desk) + "&error=access");
  return { db, user, profile: deskProfile };
});
