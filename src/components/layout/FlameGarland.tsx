export function FlameGarland() {
  return (
    <svg width="76" height="22" viewBox="0 0 100 28" aria-hidden="true">
      {["#C8341E", "#E9A31B", "#FFFFFF", "#2E7D5B", "#1F2447"].map((c, i) => (
        <path
          key={c}
          transform={`translate(${i * 20},0)`}
          d="M10 2C10 10 2 13 2 19a8 8 0 0016 0c0-6-8-9-8-17Z"
          fill={c}
          stroke={i === 2 ? "#1F2447" : "none"}
        />
      ))}
    </svg>
  );
}
