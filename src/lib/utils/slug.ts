const vowels: Record<string, string> = {
  "ಅ": "a", "ಆ": "a", "ಇ": "i", "ಈ": "i", "ಉ": "u", "ಊ": "u", "ಋ": "ru",
  "ಎ": "e", "ಏ": "e", "ಐ": "ai", "ಒ": "o", "ಓ": "o", "ಔ": "au",
};
const vowelSigns: Record<string, string> = {
  "ಾ": "a", "ಿ": "i", "ೀ": "i", "ು": "u", "ೂ": "u", "ೃ": "ru",
  "ೆ": "e", "ೇ": "e", "ೈ": "ai", "ೊ": "o", "ೋ": "o", "ೌ": "au",
};
const consonants: Record<string, string> = {
  "ಕ": "k", "ಖ": "kh", "ಗ": "g", "ಘ": "gh", "ಙ": "n",
  "ಚ": "ch", "ಛ": "chh", "ಜ": "j", "ಝ": "jh", "ಞ": "n",
  "ಟ": "t", "ಠ": "th", "ಡ": "d", "ಢ": "dh", "ಣ": "n",
  "ತ": "t", "ಥ": "th", "ದ": "d", "ಧ": "dh", "ನ": "n",
  "ಪ": "p", "ಫ": "ph", "ಬ": "b", "ಭ": "bh", "ಮ": "m",
  "ಯ": "y", "ರ": "r", "ಱ": "r", "ಲ": "l", "ವ": "v",
  "ಶ": "sh", "ಷ": "sh", "ಸ": "s", "ಹ": "h", "ಳ": "l", "ೞ": "l",
};
const VIRAMA = "್",
  ANUSVARA = "ಂ",
  VISARGA = "ಃ";

/** Readable Latin spelling of Kannada text, for URLs and Latin search. */
export function transliterateKannada(text: string) {
  const chars = [...text.normalize("NFC").replace(/[\u200c\u200d]/g, "")];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (consonants[char]) {
      out += consonants[char];
      const next = chars[i + 1];
      if (next === VIRAMA) i++;
      else if (next && vowelSigns[next]) {
        out += vowelSigns[next];
        i++;
      } else out += "a";
    } else if (vowels[char]) out += vowels[char];
    else if (char === ANUSVARA) {
      const following = consonants[chars[i + 1]] || "";
      out += /^[pbm]/.test(following) || !following ? "m" : "n";
    } else if (char === VISARGA) out += "h";
    else if (char >= "೦" && char <= "೯") out += String(char.charCodeAt(0) - 0x0ce6);
    else if (vowelSigns[char] || char === VIRAMA) continue;
    else out += char;
  }
  return out;
}

/** Lowercase, hyphenated URL slug built from a Kannada or English title. */
export function slugify(title: string) {
  return transliterateKannada(title)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
