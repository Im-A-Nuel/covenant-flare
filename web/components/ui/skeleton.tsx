import * as React from "react";

/** Shimmering placeholder block shown while store data loads. */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton${className ? ` ${className}` : ""}`} style={style} />;
}
