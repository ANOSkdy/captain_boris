import type { SVGProps } from "react";

export function UtensilsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" {...props}>
      <path d="M6 3v10" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M9.5 3v5a3.5 3.5 0 0 1-7 0V3" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M15 3v7.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M19 3v7.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M15 10.5h4c.55 0 1 .45 1 1V21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
