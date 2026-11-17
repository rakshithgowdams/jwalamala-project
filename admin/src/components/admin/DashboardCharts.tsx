"use client";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import type { Locale } from "@/lib/i18n/strings";
import { formatValue, type NumberFormat } from "@/lib/admin/format";

const shortDate = (day: string, locale: Locale) =>
  new Date(day + "T00:00:00").toLocaleDateString(locale + "-IN", { day: "numeric", month: "short" });

const palette = Array.from({ length: 8 }, (_, i) => `var(--chart-${i + 1})`);

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Counts up to the value once it scrolls into view. */
export function AnimatedNumber({
  value,
  format = "number",
  locale,
}: {
  value: number | null;
  format?: NumberFormat;
  locale: Locale;
}) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (value === null) return;
    if (prefersReducedMotion()) {
      const frame = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const element = ref.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const started = performance.now();
      const tick = (time: number) => {
        const progress = Math.min(1, (time - started) / 900);
        setShown(value * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    if (element) observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return <span ref={ref}>{value === null ? "—" : formatValue(shown, format, locale)}</span>;
}

/** Change against the previous period, coloured by direction. */
export function DeltaBadge({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (!previous && !current) return <span className="dash-delta is-flat">—</span>;
  const change = previous ? ((current - previous) / previous) * 100 : 100;
  const direction = change > 0.5 ? "up" : change < -0.5 ? "down" : "flat";
  return (
    <span className={"dash-delta is-" + direction} title={label}>
      {direction === "up" ? "▲" : direction === "down" ? "▼" : "•"} {Math.abs(Math.round(change))}%
    </span>
  );
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i],
      p1 = points[i],
      p2 = points[i + 1],
      p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6,
      c1y = p1.y + (p2.y - p0.y) / 6,
      c2x = p2.x - (p3.x - p1.x) / 6,
      c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function niceMax(value: number) {
  if (value <= 0) return 10;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value / 4) || 10;
  return Math.ceil(value / (step * power)) * step * power;
}

/** Current and previous period as smooth areas with a hover tooltip. */
export function AreaChart({
  points,
  currentLabel,
  previousLabel,
  unit,
  locale,
  emptyText,
}: {
  points: { day: string; value: number; previous: number }[];
  currentLabel: string;
  previousLabel: string;
  unit: string;
  locale: Locale;
  emptyText: string;
}) {
  const id = useId().replace(/:/g, "");
  const [active, setActive] = useState<number | null>(null);
  const width = 720,
    height = 260,
    left = 44,
    right = 12,
    top = 16,
    bottom = 28;
  const plotW = width - left - right,
    plotH = height - top - bottom;
  const max = niceMax(Math.max(...points.map((p) => Math.max(p.value, p.previous))));
  const x = (i: number) => left + (points.length > 1 ? (i * plotW) / (points.length - 1) : plotW / 2);
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const current = points.map((p, i) => ({ x: x(i), y: y(p.value) }));
  const previous = points.map((p, i) => ({ x: x(i), y: y(p.previous) }));
  const line = smoothPath(current);
  const area = line + ` L${x(points.length - 1)},${top + plotH} L${left},${top + plotH} Z`;
  const empty = points.every((p) => !p.value && !p.previous);
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  function move(event: PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / box.width;
    setActive(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))));
  }

  const hovered = active === null ? null : points[active];
  return (
    <div className="dash-area">
      <div className="dash-legend">
        <span><i style={{ background: "var(--chart-1)" }} />{currentLabel}</span>
        <span><i className="is-dashed" />{previousLabel}</span>
      </div>
      <div className="dash-area-plot">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${currentLabel}: ${formatValue(points.reduce((s, p) => s + p.value, 0), "number", locale)} ${unit}`}>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={left} x2={width - right} y1={y(max * f)} y2={y(max * f)} className="dash-gridline" />
              <text x={left - 8} y={y(max * f) + 4} textAnchor="end" className="dash-axis">
                {formatValue(max * f, "compact", locale)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === points.length - 1 ? (
              <text key={p.day} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="dash-axis">
                {shortDate(p.day, locale)}
              </text>
            ) : null,
          )}
          {!empty && (
            <>
              <path d={smoothPath(previous)} className="dash-line-previous" />
              <path d={area} fill={`url(#${id})`} className="dash-area-fill" />
              <path d={line} pathLength={1} className="dash-line" />
            </>
          )}
          {hovered && active !== null && (
            <g className="dash-crosshair">
              <line x1={x(active)} x2={x(active)} y1={top} y2={top + plotH} />
              <circle cx={x(active)} cy={y(hovered.previous)} r="4" className="is-previous" />
              <circle cx={x(active)} cy={y(hovered.value)} r="5" />
            </g>
          )}
          <rect
            x={left}
            y={top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={move}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
        {hovered && active !== null && (
          <div
            className="dash-tooltip"
            style={{ left: `${(x(active) / width) * 100}%`, transform: `translateX(${active > points.length * 0.7 ? "-105%" : "8%"})` }}
          >
            <strong>{shortDate(hovered.day, locale)}</strong>
            <span><i style={{ background: "var(--chart-1)" }} />{formatValue(hovered.value, "number", locale)} {unit}</span>
            <span><i className="is-dashed" />{formatValue(hovered.previous, "number", locale)} {previousLabel.toLowerCase()}</span>
          </div>
        )}
        {empty && <p className="dash-chart-empty">{emptyText}</p>}
      </div>
    </div>
  );
}

/** Proportions as an animated ring with a legend. */
export function DonutChart({
  slices,
  centerLabel,
  emptyText,
  locale,
}: {
  slices: { label: string; value: number }[];
  centerLabel: string;
  emptyText: string;
  locale: Locale;
}) {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const radius = 62,
    circumference = 2 * Math.PI * radius;
  let offset = 0;
  const focused = active === null ? null : slices[active];
  return (
    <div className="dash-donut">
      <div className="dash-donut-ring">
        <svg viewBox="0 0 160 160" role="img" aria-label={`${centerLabel}: ${slices.map((s) => `${s.label} ${s.value}`).join(", ")}`}>
          <circle cx="80" cy="80" r={radius} className="dash-donut-track" />
          {total > 0 &&
            slices.map((slice, i) => {
              const length = (slice.value / total) * circumference;
              const gap = slices.length > 1 ? Math.min(2, length / 3) : 0;
              const dash = ready ? Math.max(0, length - gap) : 0;
              const element = (
                <circle
                  key={slice.label}
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={palette[i % palette.length]}
                  strokeDasharray={`${dash} ${circumference}`}
                  strokeDashoffset={-offset}
                  className={"dash-donut-slice" + (active === i ? " is-active" : "")}
                  style={{ transitionDelay: `${i * 90}ms` }}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                />
              );
              offset += length;
              return element;
            })}
        </svg>
        <div className="dash-donut-center">
          <strong>{total ? formatValue(focused ? focused.value : total, "compact", locale) : "0"}</strong>
          <span>{focused ? focused.label : centerLabel}</span>
        </div>
      </div>
      {total > 0 ? (
        <ul className="dash-donut-legend">
          {slices.map((slice, i) => (
            <li
              key={slice.label}
              className={active === i ? "is-active" : ""}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
            >
              <i style={{ background: palette[i % palette.length] }} />
              <span>{slice.label}</span>
              <strong>{Math.round((slice.value / total) * 100)}%</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dash-chart-empty is-inline">{emptyText}</p>
      )}
    </div>
  );
}

/** Tiny trend line for a headline number. */
export function Sparkline({ values }: { values: number[] }) {
  const id = useId().replace(/:/g, "");
  const max = Math.max(1, ...values),
    width = 120,
    height = 36;
  const points = values.map((v, i) => ({
    x: values.length > 1 ? (i * width) / (values.length - 1) : 0,
    y: height - 3 - (v / max) * (height - 6),
  }));
  const line = smoothPath(points);
  if (!line) return null;
  return (
    <svg className="dash-spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} pathLength={1} className="dash-line" />
    </svg>
  );
}

/** Share of readers reaching each step, as narrowing bars. */
export function FunnelBars({
  steps,
  base,
  locale,
  emptyText,
}: {
  steps: { label: string; value: number }[];
  base: number;
  locale: Locale;
  emptyText: string;
}) {
  if (!base) return <p className="dash-chart-empty is-inline">{emptyText}</p>;
  return (
    <ol className="dash-funnel">
      {steps.map((step, i) => {
        const share = Math.min(100, (step.value / base) * 100);
        return (
          <li key={step.label}>
            <div className="dash-funnel-row">
              <span>{step.label}</span>
              <strong>{formatValue(share, "percent", locale)}</strong>
            </div>
            <span className="dash-funnel-track">
              <span style={{ width: `${share}%`, animationDelay: `${i * 120}ms`, background: palette[i % palette.length] }} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Ranked values as animated horizontal bars. */
export function BarList({
  items,
  unit,
  locale,
}: {
  items: { label: string; value: number; href?: string }[];
  unit: string;
  locale: Locale;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ol className="dash-barlist">
      {items.map((item, i) => (
        <li key={item.label + i}>
          <div className="dash-barlist-row">
            {item.href ? <a href={item.href}>{item.label}</a> : <span>{item.label}</span>}
            <strong>
              {formatValue(item.value, "compact", locale)} <small>{unit}</small>
            </strong>
          </div>
          <span className="dash-barlist-track" aria-hidden="true">
            <span style={{ width: `${(item.value / max) * 100}%`, animationDelay: `${i * 70}ms` }} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Bars for one series with a line for a second series on its own scale. */
export function ComboChart({
  points,
  barLabel,
  lineLabel,
  locale,
  emptyText,
}: {
  points: { day: string; bar: number; line: number }[];
  barLabel: string;
  lineLabel: string;
  locale: Locale;
  emptyText: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const width = 720,
    height = 220,
    left = 44,
    right = 40,
    top = 14,
    bottom = 26;
  const plotW = width - left - right,
    plotH = height - top - bottom;
  const barMax = niceMax(Math.max(...points.map((p) => p.bar))),
    lineMax = niceMax(Math.max(...points.map((p) => p.line)));
  const step = plotW / Math.max(1, points.length);
  const empty = points.every((p) => !p.bar && !p.line);
  const linePoints = points.map((p, i) => ({ x: left + i * step + step / 2, y: top + plotH - (p.line / lineMax) * plotH }));
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const hovered = active === null ? null : points[active];
  return (
    <div className="dash-area">
      <div className="dash-legend">
        <span><i style={{ background: "var(--chart-2)" }} />{barLabel}</span>
        <span><i style={{ background: "var(--chart-3)" }} />{lineLabel}</span>
      </div>
      <div className="dash-area-plot">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${barLabel} / ${lineLabel}`}>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={left} x2={width - right} y1={top + plotH - f * plotH} y2={top + plotH - f * plotH} className="dash-gridline" />
              <text x={left - 8} y={top + plotH - f * plotH + 4} textAnchor="end" className="dash-axis">{formatValue(barMax * f, "compact", locale)}</text>
              <text x={width - right + 8} y={top + plotH - f * plotH + 4} className="dash-axis">{formatValue(lineMax * f, "compact", locale)}</text>
            </g>
          ))}
          {!empty &&
            points.map((p, i) => {
              const h = (p.bar / barMax) * plotH;
              return (
                <rect
                  key={p.day}
                  x={left + i * step + step * 0.18}
                  y={top + plotH - h}
                  width={step * 0.64}
                  height={h}
                  rx="2"
                  className={"dash-column" + (active === i ? " is-active" : "")}
                  style={{ animationDelay: `${Math.min(i * 12, 500)}ms` }}
                />
              );
            })}
          {!empty && <path d={smoothPath(linePoints)} pathLength={1} className="dash-line is-secondary" />}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === points.length - 1 ? (
              <text key={p.day} x={left + i * step + step / 2} y={height - 7} textAnchor="middle" className="dash-axis">{shortDate(p.day, locale)}</text>
            ) : null,
          )}
          <rect
            x={left}
            y={top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              setActive(Math.max(0, Math.min(points.length - 1, Math.floor(((event.clientX - box.left) / box.width) * points.length))));
            }}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
        {hovered && active !== null && !empty && (
          <div
            className="dash-tooltip"
            style={{ left: `${((left + active * step + step / 2) / width) * 100}%`, transform: `translateX(${active > points.length * 0.7 ? "-105%" : "8%"})` }}
          >
            <strong>{shortDate(hovered.day, locale)}</strong>
            <span><i style={{ background: "var(--chart-2)" }} />{formatValue(hovered.bar, "number", locale)} {barLabel.toLowerCase()}</span>
            <span><i style={{ background: "var(--chart-3)" }} />{formatValue(hovered.line, "number", locale)} {lineLabel.toLowerCase()}</span>
          </div>
        )}
        {empty && <p className="dash-chart-empty">{emptyText}</p>}
      </div>
    </div>
  );
}
