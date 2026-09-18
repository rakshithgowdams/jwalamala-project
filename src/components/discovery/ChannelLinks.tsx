import { z } from "zod";
import { getSetting } from "@/lib/v4/settings";
const schema = z.object({
  whatsapp: z.url().optional(),
  telegram: z.url().optional(),
  youtube: z.url().optional(),
});
export async function ChannelLinks() {
  const config = schema.catch({}).parse((await getSetting("channels")) || {});
  const hosts = {
    whatsapp: ["whatsapp.com", "www.whatsapp.com"],
    telegram: ["t.me"],
    youtube: ["youtube.com", "www.youtube.com"],
  };
  return (
    <div className="channel-links">
      {Object.entries(config).map(([key, value]) => {
        const url = new URL(value!);
        if (
          url.protocol !== "https:" ||
          !hosts[key as keyof typeof hosts]?.includes(url.hostname)
        )
          return null;
        return (
          <a
            key={key}
            href={url.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {key === "whatsapp"
              ? "WhatsApp"
              : key === "telegram"
                ? "Telegram"
                : "YouTube"}
          </a>
        );
      })}
    </div>
  );
}
