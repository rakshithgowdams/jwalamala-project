import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import { resolvePostLoginPath } from "@/lib/auth/paths";
import { StaffManager, type StaffMember } from "@/components/admin/StaffManager";

const isBanned = (until: string | null | undefined) => Boolean(until && Date.parse(until) > Date.now());

export default async function StaffPage() {
  const [{ user, profile }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  // Staff who land here via ?next=/admin/staff after login go to their own home.
  if (profile.role !== "admin") {
    redirect(
      resolvePostLoginPath("/admin", {
        role: profile.role,
        admin_sections: profile.admin_sections as string[] | null,
      }),
    );
  }
  const projectRef =
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] ||
    "your-project-ref";
  const server = getAdminClient();
  const { data, error } = server
    ? await server
        .from("profiles")
        .select("id,full_name,phone,role,designation,admin_sections,created_at")
        .in("role", ["admin", "staff"])
        .order("created_at")
    : { data: null, error: true };
  if (error) console.error("[staff-diag]", typeof error === "object" ? JSON.stringify(error) : error);
  const people: StaffMember[] = await Promise.all(
    ((data || []) as {
      id: string;
      full_name: string | null;
      phone: string | null;
      role: string;
      designation: string | null;
      admin_sections: string[] | null;
    }[]).map(async (row) => {
      const { data: account } = await server!.auth.admin.getUserById(row.id);
      return {
        id: row.id,
        name: row.full_name || "",
        email: account.user?.email || "",
        phone: row.phone || "",
        designation: row.designation || "",
        role: row.role,
        sections: row.admin_sections || [],
        active: !isBanned(account.user?.banned_until),
        lastSignIn: account.user?.last_sign_in_at || null,
        self: row.id === user.id,
      };
    }),
  );

  return (
    <>
      <div className="section-title">
        <h1>{tr({ en: "Staff & access", kn: "ಸಿಬ್ಬಂದಿ ಮತ್ತು ಪ್ರವೇಶ", hi: "स्टाफ़ और पहुँच" })}</h1>
      </div>
      <p>
        {tr({
          en: "Create staff accounts and choose exactly which sidebar features each person can use. Access is enforced on every page and in the database, not just hidden from the menu.",
          kn: "ಸಿಬ್ಬಂದಿ ಖಾತೆಗಳನ್ನು ತೆರೆಯಿರಿ ಮತ್ತು ಪ್ರತಿಯೊಬ್ಬರು ಯಾವ ಸೈಡ್‌ಬಾರ್ ವಿಭಾಗಗಳನ್ನು ಬಳಸಬಹುದು ಎಂದು ಆಯ್ಕೆಮಾಡಿ. ಪ್ರವೇಶವನ್ನು ಪ್ರತಿ ಪುಟದಲ್ಲೂ ಡೇಟಾಬೇಸ್‌ನಲ್ಲೂ ಜಾರಿಗೊಳಿಸಲಾಗುತ್ತದೆ.",
          hi: "स्टाफ़ खाते बनाएँ और चुनें कि हर व्यक्ति कौन-से साइडबार फ़ीचर इस्तेमाल कर सकता है। पहुँच हर पेज और डेटाबेस में लागू होती है, सिर्फ़ मेनू से छिपाई नहीं जाती।",
        })}
      </p>
      {error ? (
        <div role="alert" style={{ display: "grid", gap: "0.75rem", maxWidth: "42rem" }}>
          <p>
            {tr({
              en: "Staff schema is missing on the database this admin app is using. “Success. No rows returned” on a different Supabase project does not apply here.",
              kn: "ಈ ಅಡ್ಮಿನ್ ಅಪ್ಲಿಕೇಶನ್ ಬಳಸುತ್ತಿರುವ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಸಿಬ್ಬಂದಿ ಸ್ಕೀಮಾ ಇಲ್ಲ. ಬೇರೆ Supabase ಪ್ರಾಜೆಕ್ಟ್‌ನಲ್ಲಿ “Success” ಬಂದರೂ ಇಲ್ಲಿ ಅನ್ವಯಿಸುವುದಿಲ್ಲ.",
              hi: "इस एडमिन ऐप वाले डेटाबेस में स्टाफ़ स्कीमा नहीं है। किसी और Supabase प्रोजेक्ट पर “Success” यहाँ लागू नहीं होता।",
            })}
          </p>
          <p>
            {tr({
              en: "Open this project’s SQL Editor, paste the full file supabase/migrations/20261116140000_staff_accounts.sql, run it, then reload:",
              kn: "ಈ ಪ್ರಾಜೆಕ್ಟ್‌ನ SQL Editor ತೆರೆಯಿರಿ, supabase/migrations/20261116140000_staff_accounts.sql ಪೂರ್ಣ ಫೈಲ್ ಅಂಟಿಸಿ, ರನ್ ಮಾಡಿ, ನಂತರ ರಿಲೋಡ್ ಮಾಡಿ:",
              hi: "इस प्रोजेक्ट का SQL Editor खोलें, supabase/migrations/20261116140000_staff_accounts.sql पूरी फ़ाइल पेस्ट करें, चलाएँ, फिर रीलोड करें:",
            })}
          </p>
          <p>
            <a href={`https://supabase.com/dashboard/project/${projectRef}/sql/new`} target="_blank" rel="noreferrer">
              supabase.com/dashboard/project/{projectRef}/sql/new
            </a>
          </p>
          <p>
            {tr({
              en: "Confirm with: select column_name from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name in ('designation', 'admin_sections'); — you must get two rows.",
              kn: "ದೃಢೀಕರಿಸಿ: select column_name from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name in ('designation', 'admin_sections'); — ಎರಡು ಸಾಲುಗಳು ಬರಬೇಕು.",
              hi: "पुष्टि: select column_name from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name in ('designation', 'admin_sections'); — दो पंक्तियाँ आनी चाहिए।",
            })}
          </p>
        </div>
      ) : (
        <StaffManager people={people} />
      )}
    </>
  );
}
