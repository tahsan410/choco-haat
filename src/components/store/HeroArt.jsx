// The hero's one memorable moment: a chocolate bar with a square snapped off,
// half-unwrapped from gold foil. Pure SVG – no image requests, instant on mobile.
export default function HeroArt({ className = '' }) {
  const cell = 74;
  const gap = 8;
  const cols = 4;
  const rows = 3;
  const squares = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 && c === cols - 1) continue; // the snapped-off piece
      squares.push({ x: 28 + c * (cell + gap), y: 34 + r * (cell + gap), key: `${r}-${c}` });
    }
  }
  return (
    <svg viewBox="0 0 420 380" className={className} role="img" aria-label="A chocolate bar with one square snapped off">
      <defs>
        <linearGradient id="hero-choc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6A4B38" /><stop offset="1" stopColor="#3A2418" /></linearGradient>
        <linearGradient id="hero-bevel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".18" /><stop offset="1" stopColor="#000000" stopOpacity=".25" /></linearGradient>
        <linearGradient id="hero-foil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F1D08E" /><stop offset=".5" stopColor="#E3B04B" /><stop offset="1" stopColor="#B8740F" /></linearGradient>
      </defs>
      <ellipse cx="215" cy="352" rx="150" ry="12" fill="#000" opacity=".25" />
      <g transform="rotate(-7 210 190)">
        <rect x="14" y="20" width="352" height="262" rx="18" fill="#2A1710" />
        {squares.map((s) => (
          <g key={s.key}>
            <rect x={s.x} y={s.y} width={cell} height={cell} rx="9" fill="url(#hero-choc)" />
            <rect x={s.x} y={s.y} width={cell} height={cell} rx="9" fill="url(#hero-bevel)" />
            <rect x={s.x + 11} y={s.y + 11} width={cell - 22} height={cell - 22} rx="5" fill="none" stroke="#FFFFFF" strokeOpacity=".10" strokeWidth="2" />
          </g>
        ))}
        {/* foil wrapper covering the bottom of the bar */}
        <path d="M14 216 L366 196 L366 264 q0 18 -18 18 H32 q-18 0 -18 -18 Z" fill="url(#hero-foil)" />
        <path d="M14 216 L366 196" stroke="#FFF3D4" strokeOpacity=".7" strokeWidth="2" fill="none" />
        <path d="M60 232 l40 -2 M120 240 l60 -3 M210 236 l70 -3" stroke="#8A5A0B" strokeOpacity=".25" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* the snapped-off square, resting in front */}
      <g transform="translate(300 262) rotate(14)">
        <rect width={cell} height={cell} rx="9" fill="url(#hero-choc)" />
        <rect width={cell} height={cell} rx="9" fill="url(#hero-bevel)" />
        <rect x="11" y="11" width={cell - 22} height={cell - 22} rx="5" fill="none" stroke="#FFFFFF" strokeOpacity=".10" strokeWidth="2" />
      </g>
    </svg>
  );
}
