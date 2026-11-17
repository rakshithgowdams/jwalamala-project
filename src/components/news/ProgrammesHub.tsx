import Link from "next/link";
import type { CSSProperties } from "react";
import { Clapperboard, PlayCircle, Radio } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";
import { pickText } from "@/lib/i18n/content";
import { getUiStrings } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/strings";
import type { Category } from "@/lib/types";
import { getSetting } from "@/lib/v4/settings";
import {
  enabledProgrammeCards,
  parseProgrammesHub,
  sortProgrammeCards,
  type ProgrammeCard,
  type ProgrammeCardSort,
} from "@/lib/v4/programmes";
import { JWALAMALA_PROGRAMMES_SLUG } from "@/lib/taxonomy";

function parseSort(value: string | undefined): ProgrammeCardSort {
  if (value === "az" || value === "za") return value;
  return "menu";
}

function cardLabel(locale: Locale, card: ProgrammeCard) {
  return pickText(locale, card.label_kn, card.label_en, card.label_hi);
}

function cardBlurb(locale: Locale, card: ProgrammeCard) {
  return pickText(locale, card.blurb_kn, card.blurb_en, card.blurb_hi);
}

function CardIcon({ kind }: { kind: ProgrammeCard["kind"] }) {
  if (kind === "social") return <PlayCircle size={22} aria-hidden="true" />;
  return <Radio size={22} aria-hidden="true" />;
}

export async function ProgrammesHub({
  category,
  filters,
}: {
  category: Category;
  filters: { sort?: string; view?: string };
}) {
  const { kn, locale } = await getUiStrings();
  const sort = parseSort(filters.sort);
  const view = filters.view === "social" || filters.view === "programme"
    ? filters.view
    : "all";
  const config = parseProgrammesHub(await getSetting("programmes_hub"));
  let cards = enabledProgrammeCards(config);
  if (view !== "all") cards = cards.filter((card) => card.kind === view);
  cards = sortProgrammeCards(cards, sort, locale);
  const name = pickText(
    locale,
    category.name_kn,
    category.name_en,
    category.name_hi,
  );
  const queryFor = (next: { sort?: string; view?: string }) => {
    const params = new URLSearchParams();
    const nextSort = next.sort ?? sort;
    const nextView = next.view ?? view;
    if (nextSort !== "menu") params.set("sort", nextSort);
    if (nextView !== "all") params.set("view", nextView);
    const qs = params.toString();
    return "/category/" + JWALAMALA_PROGRAMMES_SLUG + (qs ? "?" + qs : "");
  };
  return (
    <div className="container page-shell programmes-hub">
      <div className="breadcrumb">
        <Link href="/">{kn.home}</Link>
        <span>/</span>
        {name}
      </div>
      <div className="page-heading programmes-hub-heading">
        <p className="programmes-hub-kicker">
          <Clapperboard size={16} aria-hidden="true" />
          {kn.programmesHubKicker}
        </p>
        <h1>{name}</h1>
        <p>{kn.programmesHubIntro}</p>
      </div>
      <AdSlot placement={`category-${category.slug}-top`} />
      <div className="programmes-toolbar">
        <div className="programmes-view-tabs" role="tablist" aria-label={kn.programmesView}>
          {(
            [
              ["all", kn.all],
              ["programme", kn.programmesShows],
              ["social", kn.socialVideos],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              role="tab"
              aria-selected={view === value}
              className={"chip" + (view === value ? " active" : "")}
              href={queryFor({ view: value })}
            >
              {label}
            </Link>
          ))}
        </div>
        <form
          className="filters filter-row programmes-sort"
          method="get"
          action={"/category/" + JWALAMALA_PROGRAMMES_SLUG}
        >
          {view !== "all" ? (
            <input type="hidden" name="view" value={view} />
          ) : null}
          <label className="field">
            {kn.sort}
            <select name="sort" defaultValue={sort}>
              <option value="menu">{kn.sortMenuOrder}</option>
              <option value="az">{kn.sortNameAsc}</option>
              <option value="za">{kn.sortNameDesc}</option>
            </select>
          </label>
          <button className="button button-ember" type="submit">
            {kn.sort}
          </button>
        </form>
      </div>
      <p className="programmes-count">
        {cards.length} · {kn.programmesCardCount}
      </p>
      <div className="programmes-card-grid">
        {cards.map((card, index) => {
          const label = cardLabel(locale, card);
          const blurb = cardBlurb(locale, card);
          return (
            <Link
              key={card.id}
              href={card.href}
              className={
                "programme-show-card" +
                (card.kind === "social" ? " is-social" : "")
              }
              style={{ "--card-index": String(index) } as CSSProperties}
            >
              <span className="programme-show-icon" aria-hidden="true">
                <CardIcon kind={card.kind} />
              </span>
              <span className="programme-show-body">
                <span className="programme-show-kind">
                  {card.kind === "social" ? kn.socialVideos : kn.programmesShows}
                </span>
                <span className="programme-show-title">{label}</span>
                {blurb ? <span className="programme-show-blurb">{blurb}</span> : null}
              </span>
              <span className="programme-show-cta">{kn.openProgramme}</span>
            </Link>
          );
        })}
      </div>
      <AdSlot placement={`category-${category.slug}-bottom`} />
    </div>
  );
}

/** Compact sibling strip used on individual programme listings. */
export function ProgrammeSiblingNav({
  cards,
  currentHref,
  locale,
  label,
}: {
  cards: ProgrammeCard[];
  currentHref: string;
  locale: Locale;
  label: string;
}) {
  return (
    <nav className="programme-sibling-nav" aria-label={label}>
      <div className="programme-sibling-track">
        {cards.map((card) => {
          const active = card.href === currentHref;
          return (
            <Link
              key={card.id}
              href={card.href}
              className={
                "programme-sibling-card" +
                (active ? " active" : "") +
                (card.kind === "social" ? " is-social" : "")
              }
            >
              <span className="programme-sibling-icon" aria-hidden="true">
                <CardIcon kind={card.kind} />
              </span>
              <span>{cardLabel(locale, card)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
