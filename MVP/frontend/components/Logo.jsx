/**
 * Logo — BNPL Safeguard mark.
 * A shield (protection) holding four "pay in 4" instalment bars, the last one
 * paid (green). Designed to sit on the dark navy header beside the wordmark.
 */
export default function Logo({ size = 34 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="BNPL Safeguard logo"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <title>BNPL Safeguard</title>
      <path
        d="M24 3.5 L41 9.5 L41 25 C41 34.5 33.2 41.5 24 44.5 C14.8 41.5 7 34.5 7 25 L7 9.5 Z"
        fill="#3b82f6"
      />
      <rect x="15.5" y="15" width="17" height="3.2" rx="1.6" fill="#fff" opacity="0.92" />
      <rect x="15.5" y="20" width="17" height="3.2" rx="1.6" fill="#fff" opacity="0.92" />
      <rect x="15.5" y="25" width="17" height="3.2" rx="1.6" fill="#fff" opacity="0.92" />
      <rect x="15.5" y="30" width="17" height="3.2" rx="1.6" fill="#22c55e" />
    </svg>
  );
}
