import { redirect } from "next/navigation";

/** Unauthenticated entry: send people to the shared sign-in screen. */
export default function Home() {
  redirect("/auth/admin");
}
