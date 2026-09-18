import "./lib/supabase-env.mjs";

// Never log credentials or raw server errors (which may include connection URLs).
const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_DB_URL", "DATABASE_URL", "DIRECT_URL", "POSTGRES_URL", "SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD"];
for (const name of names) console.log(`${name}: ${process.env[name] ? "configured" : "missing"}`);
console.log(`Demo mode: ${process.env.NEXT_PUBLIC_DEMO_MODE !== "false"}`);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
let failed = false;
if (!url || !key) {
  console.error("Database verification needs the Supabase URL and server service key in .env.");
  process.exitCode = 1;
} else {
  for (const table of ["posts", "categories", "events", "places", "provider_settings"]) {
    try {
      const response = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
        headers: {apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact"},
        signal: AbortSignal.timeout(10000),
      });
      const body = await response.json();
      console.log(JSON.stringify({table, status: response.status, range: response.headers.get("content-range"), code: body.code}));
      if (!response.ok) failed = true;
    } catch {
      console.error(`${table}: connection failed`);
      failed = true;
    }
  }
  if (failed) process.exitCode = 1;
}
