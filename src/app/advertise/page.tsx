import Link from "next/link";
import {
  Ban,
  Image as ImageIcon,
  Newspaper,
  Store,
  Megaphone,
} from "lucide-react";
import { getUiStrings } from "@/lib/i18n/server";
import { getV4Rows } from "@/lib/v4/queries";
import { advertisingCopy } from "@/content/advertising";
import { BusinessAdForm } from "@/components/ads/BusinessAdForm";
import { districtName, listDistricts } from "@/lib/utils/districts";

export async function generateMetadata() {
  const { locale } = await getUiStrings();
  const copy = advertisingCopy(locale);
  return {
    title: copy.pageTitle,
    description: copy.pageIntro,
    alternates: { canonical: "/advertise" },
  };
}

export default async function AdvertisePage() {
  const [{ kn, locale }, places] = await Promise.all([
    getUiStrings(),
    getV4Rows("places"),
  ]);
  const copy = advertisingCopy(locale);
  const districts = listDistricts(places, locale, { includeHidden: true }).map(
    (district) => ({ id: district.id, name: districtName(locale, district) }),
  );
  const formats = [
    [Store, copy.formats.shop],
    [ImageIcon, copy.formats.banner],
    [Newspaper, copy.formats.sponsored],
    [Megaphone, copy.formats.google],
  ] as const;
  return (
    <div className="container page-shell advertise-page">
      <div className="breadcrumb">
        <Link href="/">{kn.home}</Link>
        <span>/</span>
        {kn.advertise}
      </div>
      <div className="discovery-heading">
        <div>
          <span className="eyebrow">{kn.advertise}</span>
          <h1>{copy.pageTitle}</h1>
          <p>{copy.pageIntro}</p>
        </div>
        <Link href="/local-shops" className="button button-outline">
          {copy.allShops}
        </Link>
      </div>
      <section className="section">
        <h2>{copy.formatsTitle}</h2>
        <ul className="ad-format-grid">
          {formats.map(([Icon, format]) => (
            <li key={format.title}>
              <Icon size={24} aria-hidden="true" />
              <h3>{format.title}</h3>
              <p>{format.text}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="section">
        <h2>{copy.stepsTitle}</h2>
        <ol className="ad-steps">
          {copy.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section className="section ad-rules" id="rules">
        <h2>{copy.rulesTitle}</h2>
        <p>{copy.rulesIntro}</p>
        <ul>
          {copy.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <h3>
          <Ban size={18} aria-hidden="true" />
          {copy.notAccepted}
        </h3>
        <ul className="ad-not-accepted">
          {copy.notAcceptedList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="section" id="apply">
        <h2>{copy.formTitle}</h2>
        <BusinessAdForm districts={districts} />
      </section>
    </div>
  );
}
