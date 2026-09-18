// CPCB National AQI breakpoints, four 24-hour pollutants.
// Source: https://cpcb.nic.in/displaypdf.php?id=bmF0aW9uYWwtYWlyLXF1YWxpdHktaW5kZXgvQWJvdXRfQVFJLnBkZg
// Values above the last breakpoint are displayed as >400, not a fabricated exact severe index.
export type Pollutants = {
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  so2: number | null;
};
const upper = {
  pm25: [30, 60, 90, 120, 250],
  pm10: [50, 100, 250, 350, 430],
  no2: [40, 80, 180, 280, 400],
  so2: [40, 80, 380, 800, 1600],
};
export function pollutantIndex(kind: keyof Pollutants, value: number | null) {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  const concentration = Math.round(value),
    ends = upper[kind],
    indexEnds = [50, 100, 200, 300, 400];
  for (let i = 0; i < ends.length; i++) {
    if (concentration <= ends[i]) {
      const low = i === 0 ? 0 : ends[i - 1] + 1,
        indexLow = i === 0 ? 0 : indexEnds[i - 1] + 1;
      return Math.round(
        indexLow +
          ((concentration - low) * (indexEnds[i] - indexLow)) / (ends[i] - low),
      );
    }
  }
  return 401;
}
export function naqi(values: Pollutants) {
  const entries = (Object.keys(values) as (keyof Pollutants)[])
    .map((kind) => pollutantIndex(kind, values[kind]))
    .filter((value): value is number => value !== null);
  if (
    entries.length < 3 ||
    (pollutantIndex("pm25", values.pm25) === null &&
      pollutantIndex("pm10", values.pm10) === null)
  )
    return null;
  return Math.max(...entries);
}
export function aqiCategory(value: number | null) {
  if (value === null) return null;
  return value <= 50
    ? 0
    : value <= 100
      ? 1
      : value <= 200
        ? 2
        : value <= 300
          ? 3
          : value <= 400
            ? 4
            : 5;
}
export function hourlyAverage(values: (number | null)[], minimum = 16) {
  const valid = values.filter(
    (value): value is number =>
      value !== null && Number.isFinite(value) && value >= 0,
  );
  return valid.length >= minimum
    ? valid.reduce((a, b) => a + b, 0) / valid.length
    : null;
}
