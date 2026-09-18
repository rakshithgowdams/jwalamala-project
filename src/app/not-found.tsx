import Link from "next/link";
import { getUiStrings } from "@/lib/i18n/server";

export default async function NotFound() {
  const { kn } = await getUiStrings();
  return (
    <div className="not-found-page">
      <div className="not-found-scene">
        <div className="not-found-flames" aria-hidden="true">
          <span className="nf-flame nf-flame-1" />
          <span className="nf-flame nf-flame-2" />
          <span className="nf-flame nf-flame-3" />
          <span className="nf-flame nf-flame-4" />
          <span className="nf-flame nf-flame-5" />
        </div>

        <div className="not-found-digits" aria-hidden="true">
          <span className="nf-digit">4</span>
          <span className="nf-zero">
            <span className="nf-ring" />
          </span>
          <span className="nf-digit">4</span>
        </div>

        <div className="not-found-embers" aria-hidden="true">
          <span className="nf-ember nf-ember-1" />
          <span className="nf-ember nf-ember-2" />
          <span className="nf-ember nf-ember-3" />
          <span className="nf-ember nf-ember-4" />
          <span className="nf-ember nf-ember-5" />
          <span className="nf-ember nf-ember-6" />
          <span className="nf-ember nf-ember-7" />
          <span className="nf-ember nf-ember-8" />
        </div>
      </div>

      <h1 className="not-found-title">{kn.notFound}</h1>
      <p className="not-found-text">{kn.notFoundText}</p>

      <div className="not-found-actions">
        <Link href="/" className="not-found-home">
          {kn.home}
        </Link>
        <Link href="/search" className="not-found-search">
          {kn.search}
        </Link>
      </div>

      <div className="not-found-divider" aria-hidden="true">
        <span />
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span />
      </div>

      <nav className="not-found-links">
        <Link href="/news">{kn.news}</Link>
        <Link href="/videos">{kn.videos}</Link>
        <Link href="/events">{kn.events}</Link>
        <Link href="/contact">{kn.contact}</Link>
      </nav>
    </div>
  );
}
