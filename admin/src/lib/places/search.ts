import { transliterateKannada } from "@/lib/utils/slug";

export type PlaceOption = {
  id: string;
  name_kn: string;
  name_en?: string | null;
  district?: string | null;
  is_district?: boolean | null;
};

/**
 * Folds the many Latin spellings of one Kannada name together, so "Mangaluru",
 * "mangalooru" and the transliteration "mangaluru" compare equal, and
 * "Shivamogga" matches "shivamoga".
 */
function loose(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/w/g, "v")
    .replace(/([bcdgjkpstz])h/g, "$1")
    .replace(/(.)\1+/g, "$1");
}

/** Pre-2014 and colonial English names editors still type, keyed by the current name. */
const formerNames: Record<string, string[]> = {
  Bengaluru: ["Bangalore"],
  "Bengaluru Urban": ["Bangalore Urban", "Bangalore"],
  "Bengaluru North": ["Bangalore Rural", "Bengaluru Rural"],
  "Bengaluru South": ["Ramanagara", "Ramanagaram"],
  Mysuru: ["Mysore"],
  Mangaluru: ["Mangalore"],
  Belagavi: ["Belgaum"],
  Kalaburagi: ["Gulbarga"],
  Ballari: ["Bellary"],
  Vijayapura: ["Bijapur"],
  Hubballi: ["Hubli"],
  Tumakuru: ["Tumkur"],
  Shivamogga: ["Shimoga"],
  Chikkamagaluru: ["Chikmagalur"],
  Chikkaballapur: ["Chickballapur"],
  Hosapete: ["Hospet"],
  Davanagere: ["Davangere"],
  Bagalkote: ["Bagalkot"],
  Chamarajanagar: ["Chamrajnagar"],
  Kodagu: ["Coorg"],
  Madikeri: ["Mercara"],
  Kundapura: ["Coondapur"],
  Srirangapatna: ["Seringapatam"],
  "Dakshina Kannada": ["South Canara"],
  "Uttara Kannada": ["North Canara"],
  Moodbidri: ["Mudbidri", "Moodabidri"],
  Dharmastala: ["Dharmasthala"],
  Shravanabelagola: ["Sravanabelagola"],
};

const kannada = (text: string) => text.normalize("NFC").replace(/[\s.\u200c\u200d]/g, "");

type Indexed = { option: PlaceOption; names: string[]; districts: string[] };

/** Precomputes the searchable forms once per list instead of on every keystroke. */
export function indexPlaces(options: PlaceOption[]): Indexed[] {
  const districtEnglish = new Map(
    options.filter((o) => o.is_district).map((o) => [o.name_kn, o.name_en || ""]),
  );
  return options.map((option) => {
    const district = option.district || "";
    return {
      option,
      names: [
        kannada(option.name_kn),
        loose(option.name_en || ""),
        loose(transliterateKannada(option.name_kn)),
        ...(formerNames[option.name_en || ""] || []).map(loose),
      ].filter(Boolean),
      districts: [
        kannada(district),
        loose(districtEnglish.get(district) || ""),
        loose(transliterateKannada(district)),
      ].filter(Boolean),
    };
  });
}

/**
 * Places matching a Kannada or English query. Name matches rank above towns
 * that only match through their district, so "udupi" lists Udupi itself
 * first and then every town in Udupi district.
 */
export function searchPlaces(index: Indexed[], query: string, limit = 50) {
  const forms = [kannada(query), loose(query)].filter(Boolean);
  if (!forms.length) return index.slice(0, limit).map((entry) => entry.option);
  const scored: { option: PlaceOption; score: number }[] = [];
  for (const entry of index) {
    let score = Infinity;
    for (const form of forms) {
      if (entry.names.some((name) => name.startsWith(form))) score = Math.min(score, 0);
      else if (entry.names.some((name) => name.includes(form))) score = Math.min(score, 1);
      else if (entry.districts.some((name) => name.startsWith(form))) score = Math.min(score, 2);
    }
    if (score !== Infinity) scored.push({ option: entry.option, score });
  }
  return scored
    .sort(
      (a, b) =>
        a.score - b.score ||
        Number(Boolean(b.option.is_district)) - Number(Boolean(a.option.is_district)) ||
        a.option.name_kn.localeCompare(b.option.name_kn, "kn"),
    )
    .slice(0, limit)
    .map((entry) => entry.option);
}
