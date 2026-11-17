import { z } from "zod";
export const localPath = z
  .string()
  .min(1)
  .max(1000)
  .refine(
    (p) =>
      p.startsWith("/") &&
      !p.startsWith("//") &&
      !/[\\\r\n]/.test(p) &&
      !/%(?:2f|5c|0a|0d)/i.test(p) &&
      !p.includes("#"),
    "Use a local site path",
  );
export const redirectSchema = z
  .object({ old_path: localPath, new_path: localPath })
  .refine(
    (p) => p.old_path !== p.new_path,
    "Source and destination must differ",
  );
