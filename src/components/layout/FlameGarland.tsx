// Measured from the reference artwork: a 46px band of five stripes, its left end
// cut at 50deg and its right end flush.
const BAND_HEIGHT = 46;
const stripes = [
  { fill: "#DA251D", height: 8 },
  { fill: "#F9C300", height: 9 },
  { fill: "#FFFFFF", height: 11 },
  { fill: "#009246", height: 9 },
  { fill: "#1E1917", height: 9 },
];

// The viewBox is wider per unit than it is tall (76/100 against 22/28), so the
// artwork's 1.2 run is corrected or the cut renders shallower than the original.
const SLANT = 1.2 * (22 / 28) * (100 / 76);
const left = (y: number) => ((28 - y) * SLANT).toFixed(2);

const bands: { fill: string; points: string }[] = [];
let top = 0;
for (const stripe of stripes) {
  const bottom = top + (stripe.height / BAND_HEIGHT) * 28;
  bands.push({
    fill: stripe.fill,
    points: `${left(top)},${top.toFixed(2)} 100,${top.toFixed(2)} 100,${bottom.toFixed(2)} ${left(bottom)},${bottom.toFixed(2)}`,
  });
  top = bottom;
}

export function FlameGarland() {
  return (
    <svg width="76" height="22" viewBox="0 0 100 28" aria-hidden="true">
      {bands.map((band) => (
        <polygon key={band.fill} fill={band.fill} points={band.points} />
      ))}
    </svg>
  );
}
