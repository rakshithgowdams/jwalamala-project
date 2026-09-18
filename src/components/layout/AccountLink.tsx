import Link from "next/link";
import { UserRound } from "lucide-react";
import { getServerClient } from "@/lib/supabase/server";
import { getUiStrings } from "@/lib/i18n/server";
import { Logout } from "@/components/auth/AccountControls";
export async function AccountLink() {
  const { kn } = await getUiStrings();
  const db = await getServerClient();
  const {
    data: { user },
  } = db ? await db.auth.getUser() : { data: { user: null } };
  if (!user)
    return (
      <Link href="/login" className="icon-button" aria-label={kn.login}>
        <UserRound size={21} />
      </Link>
    );
  return (
    <details className="account-menu" data-motion="off">
      <summary className="icon-button" aria-label={kn.account}>
        <UserRound size={21} />
      </summary>
      <div className="account-popover">
        <Link className="button button-outline" href="/account">
          {kn.account}
        </Link>
        <Logout />
      </div>
    </details>
  );
}
