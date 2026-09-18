const base = "http://127.0.0.1:3000";
const paths = [
  "/",
  "/news",
  "/videos",
  "/shorts",
  "/events",
  "/weather",
  "/search",
  "/polls",
  "/quizzes",
  "/rates",
  "/reservoirs",
  "/jain-calendar",
  "/corrections",
  "/contact",
  "/credits",
  "/newsletter",
  "/category/news",
  "/login",
  "/signup",
];

const KANNADA = /[\u0C80-\u0CFF]/g;
const DEVANAGARI = /[\u0900-\u097F]/g;

// The RSC flight payload inlined in <script> tags carries both languages, so it
// is stripped before counting; only rendered markup is measured.
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

async function grab(path, locale, attempt = 1) {
  try {
    const res = await fetch(base + path, {
      headers: { cookie: `jwalamala-language=${locale}` },
    });
    const html = await res.text();
    const text = visibleText(html);
    return {
      status: res.status,
      kannada: (text.match(KANNADA) || []).length,
      hindi: (text.match(DEVANAGARI) || []).length,
      title: (html.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1] || "",
    };
  } catch (error) {
    // The dev server occasionally resets while recompiling a cold route.
    if (attempt < 3) {
      await new Promise((done) => setTimeout(done, 2000));
      return grab(path, locale, attempt + 1);
    }
    return {
      status: 0,
      kannada: -1,
      hindi: -1,
      title: String(error.cause || error),
    };
  }
}

const rows = [];
for (const path of paths) {
  const kn = await grab(path, "kn");
  const en = await grab(path, "en");
  const hi = await grab(path, "hi");
  rows.push({ path, kn, en, hi });
  console.log(
    `${path.padEnd(18)} kn:${String(kn.status).padEnd(4)}${String(kn.kannada).padStart(5)}  ` +
      `en:${String(en.status).padEnd(4)}${String(en.kannada).padStart(5)}  ` +
      `hi:${String(hi.status).padEnd(4)} kn${String(hi.kannada).padStart(5)} dev${String(hi.hindi).padStart(5)}  ` +
      `title(hi): ${hi.title.slice(0, 32)}`,
  );
}

// Kannada in an English page is untranslated UI. Kannada in a Hindi page is
// expected for article bodies, which have no Hindi column, so Hindi is judged
// on whether Devanagari renders at all.
const leaking = rows.filter((r) => r.en.kannada > 0 && r.en.status === 200);
const noHindi = rows.filter((r) => r.hi.status === 200 && r.hi.hindi === 0);
const broken = rows.filter((r) => r.hi.status !== 200);
console.log(
  `\n${rows.length} pages checked. English pages still containing Kannada: ${leaking.length}`,
);
for (const r of leaking) {
  console.log(`  ${r.path}: ${r.en.kannada} Kannada chars`);
}
console.log(`Hindi pages rendering no Devanagari: ${noHindi.length}`);
for (const r of noHindi) console.log(`  ${r.path}`);
console.log(`Hindi pages not returning 200: ${broken.length}`);
for (const r of broken)
  console.log(`  ${r.path}: ${r.hi.status} ${r.hi.title}`);
