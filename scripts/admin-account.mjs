import "./lib/supabase-env.mjs";
import { createClient } from "@supabase/supabase-js";

// This command never takes passwords, auto-confirms email, or sends mail.
// Register and verify the account first; promotion requires an exact email.
const email = process.argv.find((arg) => arg.startsWith("--email="))?.slice(8).trim().toLowerCase();
const apply = process.argv.includes("--apply");
try {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Use npm run admin:account -- --email=owner@example.com [--apply].");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Add the Supabase URL and server service-role key to .env locally. Never share the key in chat.");
  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
  });
  const { data: secure, error: securityError } = await db.rpc("account_security_ready");
  if (securityError || secure !== true) throw new Error("Apply 20260918000100_secure_account_creation.sql before provisioning an administrator.");
  let account;
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error("Unable to look up Auth users. Check the server credential.");
    account = data.users.find((user) => user.email?.toLowerCase() === email);
    if (account || data.users.length < 100) break;
  }
  if (!account) throw new Error("No matching account. Create it at /signup and confirm its email first.");
  if (!account.email_confirmed_at) throw new Error("The account's email must be confirmed before assigning administrator access.");
  const { data: profile, error: profileError } = await db.from("profiles").select("id,role").eq("id", account.id).single();
  if (profileError || !profile) throw new Error("The account profile is missing. Check the application schema and signup trigger.");
  if (profile.role === "admin") { console.log("This verified account is already an administrator."); }
  else if (!apply) { console.log(`Verified account found; current role: ${profile.role}. Rerun with --apply to assign administrator access.`); }
  else {
    const { data, error } = await db.from("profiles").update({ role: "admin" }).eq("id", account.id).select("role").single();
    if (error || data?.role !== "admin") throw new Error("Administrator assignment failed. No success claimed; inspect the profile before retrying.");
    console.log("Administrator access assigned and verified. Sign in at /auth/admin.");
  }
} catch (error) {
  console.error(error instanceof Error && error.name === "Error" ? error.message : "Account setup failed. Check configuration without sharing credentials.");
  process.exitCode = 1;
}
