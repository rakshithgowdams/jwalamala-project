import "./lib/supabase-env.mjs";
let failures = 0;
function check(label, passed) {
  console.log(`${passed ? "PASS" : "BLOCKED"}: ${label}`);
  if (!passed) failures++;
}
check("Live mode enabled", process.env.NEXT_PUBLIC_DEMO_MODE === "false");
let siteUrl;
try { siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL); } catch { /* Report below. */ }
check("Public HTTPS site URL", !!siteUrl && siteUrl.protocol === "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(siteUrl.hostname));
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "IP_HASH_SECRET", "CRON_SECRET"]) {
  check(`${name} configured`, !!process.env[name]);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (url && anonKey) {
  try {
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey }, signal: AbortSignal.timeout(10000) });
    check("Authentication reachable", response.ok);
    if (response.ok) {
      const settings = await response.json();
      check("Email/password provider enabled", settings.external?.email === true);
      check("Public account creation enabled", settings.disable_signup === false);
      check("Email confirmation required", settings.mailer_autoconfirm === false);
      console.log(`INFO: Google ${settings.external?.google ? "enabled" : "disabled"}; phone ${settings.external?.phone ? "enabled" : "disabled"}`);
    }
  } catch { check("Authentication reachable", false); }
  for (const table of ["profiles", "posts", "categories", "bookmarks", "event_reminders", "provider_settings"]) {
    try {
      const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, {
        headers: { apikey: anonKey }, signal: AbortSignal.timeout(10000),
      });
      check(`${table} schema available`, response.ok);
    } catch { check(`${table} schema available`, false); }
  }
}
if (url && serviceKey) {
  try {
    const response = await fetch(`${url}/rest/v1/rpc/account_security_ready`, {
      method: "POST", headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: "{}", signal: AbortSignal.timeout(10000),
    });
    check("Public signup cannot become administrator", response.ok && await response.json() === true);
  } catch { check("Public signup cannot become administrator", false); }
} else check("Server credential and account security migration verified", false);
console.log("MANUAL: Verify SMTP delivery, callback allowlist, CAPTCHA/rate limits, backups, real content, and each enabled provider against the production deployment.");
console.log(`${failures} automated launch blocker(s). This check does not certify every feature or external provider.`);
process.exitCode = failures ? 1 : 0;
