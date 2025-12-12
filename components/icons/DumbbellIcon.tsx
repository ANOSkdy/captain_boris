import type { SVGProps } from "react";

export function DumbbellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" {...props}>
      <path d="M5 6v4M5 14v4M19 6v4M19 14v4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M7.5 10h9M7.5 14h9" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <rect x="9.5" y="9" width="5" height="6" rx="1.5" stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}
