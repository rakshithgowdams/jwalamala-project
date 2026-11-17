import { z } from "zod";
export const commentSettingsSchema = z.object({
  enabled: z.boolean(),
  blocked_words: z.array(z.string().trim().min(1).max(100)).max(200),
  slow_seconds: z.number().int().min(30).max(3600),
});
export const defaultComments = {
  enabled: false,
  blocked_words: [],
  slow_seconds: 60,
};
export function containsBlockedWord(text: string, words: string[]) {
  const normalized = text.normalize("NFKC").toLocaleLowerCase();
  return words.some((word) =>
    normalized.includes(word.normalize("NFKC").toLocaleLowerCase()),
  );
}
