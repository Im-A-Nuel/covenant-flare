export function CovenantMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
    >
      <path d="M12.4 6.5C8.6 9 8.6 21 12.4 23.5" stroke="#0c0c0d" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M17.6 6.5C21.4 9 21.4 21 17.6 23.5" stroke="#0c0c0d" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="15" cy="15" r="2.7" fill="#0c0c0d" />
    </svg>
  );
}
