import type { Pollutants } from "./aqi";
export type WeatherSnapshot = {
  place_id: string;
  fetched_at: string;
  provider: string;
  current: {
    temperature: number | null;
    feels_like: number | null;
    humidity: number | null;
    wind: number | null;
    code: number | null;
  };
  hourly: { time: string; temperature: number | null; rain: number | null }[];
  daily: {
    date: string;
    min: number | null;
    max: number | null;
    rain: number | null;
  }[];
};
export type AqiSnapshot = {
  place_id: string;
  fetched_at: string;
  provider: string;
  pollutants: Pollutants;
  naqi: number | null;
};
export type WeatherResult = {
  weather: WeatherSnapshot | null;
  aqi: AqiSnapshot | null;
  stale: boolean;
};
export interface WeatherProvider {
  fetch(
    lat: number,
    lng: number,
    placeId: string,
  ): Promise<{ weather: WeatherSnapshot; aqi: AqiSnapshot }>;
}
