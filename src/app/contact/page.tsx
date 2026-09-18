import { ContactForm } from "@/components/forms/ContactForm";
import { getUiStrings } from "@/lib/i18n/server";
export async function generateMetadata() {
  const { kn } = await getUiStrings();
  return {
    title: kn.contact,
    alternates: { canonical: "/contact" },
  };
}
export default async function Contact() {
  const { kn } = await getUiStrings();
  return (
    <div className="container page-shell text-page">
      <div className="page-heading">
        <h1>{kn.sendNews}</h1>
        <p>{kn.sendDescription}</p>
      </div>
      <ContactForm />
    </div>
  );
}
