"use client";

import type { ReactNode } from "react";

export interface Segment {
  value: number;
  color: string;
  cat: string;
}

export function Donut({
  segments,
  size = 240,
  thickness = 26,
  gap = 2.5,
  children,
  onSegment,
  activeCat,
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
  gap?: number;
  children?: ReactNode;
  onSegment?: (cat: string) => void;
  activeCat?: string | null;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;

  const fracs = segments.map((s) => s.value / total);
  const offsetAt = (i: number) => fracs.slice(0, i).reduce((s, f) => s + f * C, 0);
  const arcs = segments.map((seg, i) => {
    const len = Math.max(fracs[i] * C - gap, 0.5);
    return (
      <circle
        key={seg.cat || i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={activeCat === seg.cat ? thickness + 4 : thickness}
        strokeLinecap="round"
        strokeDasharray={`${len} ${C - len}`}
        strokeDashoffset={-offsetAt(i)}
        onClick={onSegment ? () => onSegment(seg.cat) : undefined}
        style={{
          cursor: onSegment ? "pointer" : "default",
          transition: "opacity .2s, stroke-width .2s",
          opacity: activeCat && activeCat !== seg.cat ? 0.35 : 1,
        }}
      />
    );
  });

  return (
    <div
      className="donut-in"
      style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)", display: "block" }}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-2)" strokeWidth={thickness} />
        {arcs}
      </svg>
      {children != null && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            padding: thickness + 6,
          }}
        >
          <div style={{ width: "100%" }}>{children}</div>
        </div>
      )}
    </div>
  );
}
