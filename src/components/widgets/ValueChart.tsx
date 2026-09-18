export function ValueChart({
  points,
  label,
  unit,
}: {
  points: { date: string; value: number }[];
  label: string;
  unit: string;
}) {
  if (points.length < 2) return null;
  const sorted = [...points]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);
  const min = Math.min(...sorted.map((p) => p.value)),
    max = Math.max(...sorted.map((p) => p.value));
  const xy = sorted.map((p, i) => ({
    x: 20 + (i * 560) / (sorted.length - 1),
    y: 130 - ((p.value - min) * 110) / (max - min || 1),
    ...p,
  }));
  return (
    <figure className="value-chart">
      <figcaption>
        {label} · {unit}
      </figcaption>
      <svg
        viewBox="0 0 600 160"
        role="img"
        aria-label={label + " " + sorted[0].date + " – " + sorted.at(-1)!.date}
      >
        <path
          d={xy.map((p, i) => (i ? "L" : "M") + p.x + "," + p.y).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        {xy.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r="4" fill="currentColor">
            <title>
              {p.date}: {p.value} {unit}
            </title>
          </circle>
        ))}
      </svg>
      <p className="meta">
        {sorted[0].date} — {sorted.at(-1)!.date} · {min}–{max} {unit}
      </p>
    </figure>
  );
}
