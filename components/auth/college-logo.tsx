type Props = {
  className?: string;
  size?: number;
};

/** Lightweight institutional mark — no external image required. */
export function CollegeLogo({ className = '', size = 72 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={className}
      aria-hidden
      role="img"
    >
      <circle cx="40" cy="40" r="38" fill="#1e3a5f" stroke="#cbd5e1" strokeWidth="2" />
      <path
        d="M40 14 L58 26 V54 L40 66 L22 54 V26 Z"
        fill="none"
        stroke="#f8fafc"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <text
        x="40"
        y="44"
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="14"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        RCE
      </text>
    </svg>
  );
}
