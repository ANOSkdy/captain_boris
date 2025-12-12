import type { CSSProperties, HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  glass?: boolean;
};

export function Card({ glass = true, style, className, ...props }: CardProps) {
  const base: CSSProperties = {
    borderRadius: "var(--radius)",
    border: "1px solid var(--card-border)",
    background: "var(--card-bg)",
    boxShadow: "var(--shadow)",
  };

  const glassStyle: CSSProperties = glass
    ? { backdropFilter: "blur(var(--blur))", WebkitBackdropFilter: "blur(var(--blur))" }
    : {};

  const mergedClass = ["cb-card", glass ? "cb-glass" : "", className ?? ""].filter(Boolean).join(" ");

  return <div {...props} className={mergedClass} style={{ ...base, ...glassStyle, ...style }} />;
}