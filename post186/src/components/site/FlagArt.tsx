/**
 * Original stars-and-stripes artwork drawn in code, in the spirit of the
 * national site's hero. Purely decorative — hidden from screen readers.
 */

function starPoints(cx: number, cy: number, outer: number): string {
  const inner = outer * 0.382;
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(" ");
}

const HERO_STARS: [number, number, number][] = [
  [118, 96, 30],
  [214, 54, 22],
  [62, 196, 24],
  [176, 176, 34],
  [282, 132, 18],
  [104, 298, 32],
  [226, 284, 24],
  [44, 390, 20],
  [164, 396, 28],
  [292, 238, 16],
];

export function HeroArt({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 760 560"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="hero-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.38" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="hero-mask">
          <rect width="760" height="560" fill="url(#hero-fade)" />
        </mask>
        <clipPath id="hero-panel">
          <path d="M330 60 Q340 28 372 28 H900 V532 H190 Z" />
        </clipPath>
      </defs>
      <g mask="url(#hero-mask)">
        <g clipPath="url(#hero-panel)">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect
              key={i}
              x="150"
              y={28 + i * 72}
              width="760"
              height="72"
              fill={i % 2 === 0 ? "#d72131" : "#ffffff"}
              opacity={i % 2 === 0 ? 0.92 : 0.94}
            />
          ))}
        </g>
        {HERO_STARS.map(([x, y, r], i) => (
          <polygon key={i} points={starPoints(x, y, r)} fill="#3d7fc0" opacity={0.55 + (i % 3) * 0.12} />
        ))}
      </g>
    </svg>
  );
}

const FIELD_STARS: [number, number, number][] = [
  [70, 60, 20],
  [190, 40, 14],
  [300, 90, 24],
  [130, 150, 16],
  [250, 190, 18],
  [380, 170, 14],
  [60, 240, 14],
  [420, 60, 18],
  [340, 260, 20],
  [180, 280, 22],
  [470, 230, 16],
];

export function StarField({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 520 320" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="field-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="field-mask">
          <rect width="520" height="320" fill="url(#field-fade)" />
        </mask>
      </defs>
      <g mask="url(#field-mask)">
        {FIELD_STARS.map(([x, y, r], i) => (
          <polygon key={i} points={starPoints(x, y, r)} fill="#3d7fc0" opacity={0.35 + (i % 4) * 0.1} />
        ))}
      </g>
    </svg>
  );
}

/** A short row of white stars, used as a divider on dark bands. */
export function StarRow({ count = 5, className = "" }: { count?: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${count * 28} 24`}
      width={count * 28}
      height={24}
      aria-hidden="true"
      focusable="false"
    >
      {Array.from({ length: count }, (_, i) => (
        <polygon key={i} points={starPoints(14 + i * 28, 12, 9)} fill="currentColor" />
      ))}
    </svg>
  );
}
