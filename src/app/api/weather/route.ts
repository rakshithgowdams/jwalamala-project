import { getV4Rows } from "@/lib/v4/queries";
import { getWeather } from "@/lib/weather/queries";
export async function GET(request: Request) {
  const place = (await getV4Rows("places")).find(
    (place) =>
      place.slug ===
      (new URL(request.url).searchParams.get("place") || "bengaluru-urban"),
  );
  if (!place) return Response.json({ error: "not-found" }, { status: 404 });
  return Response.json(
    { place, ...(await getWeather(place.id, place.lat, place.lng)) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600",
      },
    },
  );
}
