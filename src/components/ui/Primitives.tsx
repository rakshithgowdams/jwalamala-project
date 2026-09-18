"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import Link from "next/link";
import { ArrowRight, CalendarDays, SearchX } from "lucide-react";

import { formatDate } from "@/lib/utils/dates";
export function EventDateBadge({ date }: { date: string }) {
  const { locale } = useUiStrings();
  return (
    <span className="date-badge">
      <CalendarDays size={13} />
      <time dateTime={date}>{formatDate(date, false, locale)}</time>
    </span>
  );
}
export function SectionTitle({
  children,
  href,
  label,
}: {
  children: React.ReactNode;
  href?: string;
  label?: string;
}) {
  const { kn } = useUiStrings();
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {href && (
        <Link href={href}>
          {label || kn.readMore}
          <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const { kn } = useUiStrings();
  return (
    <div className="empty-state">
      <SearchX size={34} />
      <h2>{title || kn.noResults}</h2>
      <p>{description || kn.tryAgain}</p>
      <Link href="/" className="button button-outline">
        {kn.backHome}
      </Link>
    </div>
  );
}
export function Skeleton() {
  return <div className="skeleton" aria-hidden="true" />;
}
export function SampleNotice() {
  const { kn } = useUiStrings();
  return (
    <div className="sample-notice">
      <span>{kn.sample}</span>
      {kn.sampleNote}
    </div>
  );
}
