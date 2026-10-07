import "server-only";
import { site } from "@/config/site";

export type AuthMethods = {
  available: boolean;
  email: boolean;
  google: boolean;
  phone: boolean;
  signup: boolean;
};

/** Only offer providers that the connected Auth service actually enables. */
export async function getAuthMethods(): Promise<AuthMethods> {
  const unavailable: AuthMethods = {
    available: false, email: false, google: false, phone: false, signup: false,
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (site.demo || !url || !key) return unavailable;
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return unavailable;
    const settings = await response.json();
    return {
      available: true,
      email: settings.external?.email === true,
      google: settings.external?.google === true,
      phone: settings.external?.phone === true,
      signup: settings.disable_signup === false,
    };
  } catch {
    return unavailable;
  }
}
