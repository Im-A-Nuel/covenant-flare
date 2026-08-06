import * as React from "react";

/** Small line icons used in phone mocks and the policy guard (replace emoji glyphs). */
type IconProps = { size?: number };

function S({ size = 15, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const IconBot = ({ size }: IconProps) => (
  <S size={size}>
    <rect x="4.5" y="8" width="15" height="11" rx="3" />
    <path d="M12 5v3" />
    <circle cx="12" cy="3.9" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="13.4" r="1.05" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="13.4" r="1.05" fill="currentColor" stroke="none" />
  </S>
);

export const IconCoin = ({ size }: IconProps) => (
  <S size={size}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v8M14 9.6c-.5-.7-1.2-1.1-2-1.1-1.3 0-2.3.8-2.3 1.9 0 2.3 4.6 1.1 4.6 3.5 0 1.1-1 1.9-2.3 1.9-.8 0-1.6-.4-2.1-1.1" />
  </S>
);

export const IconClock = ({ size }: IconProps) => (
  <S size={size}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4.2l2.6 1.5" />
  </S>
);

export const IconLimit = ({ size }: IconProps) => (
  <S size={size}>
    <circle cx="12" cy="12" r="8" />
    <path d="M8.3 12h7.4" />
  </S>
);

export const IconTarget = ({ size }: IconProps) => (
  <S size={size}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.3" />
  </S>
);

export const IconCheck = ({ size }: IconProps) => (
  <S size={size}>
    <path d="M5 12.5l4.2 4.2L19 7" />
  </S>
);
