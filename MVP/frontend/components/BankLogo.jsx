/**
 * BankLogo — bank mark for the Open Banking selection screen.
 *
 * Prefers a real logo image at `public/logos/<id>.png`. If that file is missing
 * (or fails to load), it falls back to a brand-coloured monogram tile, so the UI
 * never shows a broken image and still renders offline.
 *
 * The image chip is sized by HEIGHT with flexible width (capped), so wide
 * wordmark logos (Barclays, Lloyds, Monzo) render large and legible instead of
 * being shrunk to fit a square. `size` controls the chip height.
 *
 * Drop your PNGs in `frontend/public/logos/` named by bank id:
 *   barclays.png  hsbc.png  lloyds.png  monzo.png  starling.png  natwest.png
 */
import { useState } from 'react';

const BRANDS = {
  barclays: { bg: '#00AEEF', initial: 'B' }, // Barclays cyan
  hsbc:     { bg: '#DB0011', initial: 'H' }, // HSBC red
  lloyds:   { bg: '#006A4D', initial: 'L' }, // Lloyds green
  monzo:    { bg: '#FF4F40', initial: 'M' }, // Monzo coral
  starling: { bg: '#14A89B', initial: 'S' }, // Starling teal
  natwest:  { bg: '#5A287D', initial: 'N' }, // NatWest purple
};

export default function BankLogo({ id, size = 32, src }) {
  const [failed, setFailed] = useState(false);
  const brand = BRANDS[id] || { bg: '#94a3b8', initial: '?' };
  const imgSrc = src || `/logos/${id}.png`;

  // Real logo on a white chip — sized by height, width flexes for wordmarks.
  if (!failed) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: size,
          minWidth: size,
          flexShrink: 0,
          padding: `0 ${Math.round(size * 0.2)}px`,
          borderRadius: size * 0.22,
          background: '#fff',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <img
          src={imgSrc}
          alt={id}
          onError={() => setFailed(true)}
          style={{
            height: size * 0.78,
            width: 'auto',
            maxWidth: size * 2.6,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </span>
    );
  }

  // Fallback: brand-coloured monogram tile (square).
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: size * 0.28,
        background: brand.bg,
        color: '#fff',
        fontWeight: 800,
        fontSize: size * 0.5,
        lineHeight: 1,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {brand.initial}
    </span>
  );
}
