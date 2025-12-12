import type { SVGProps } from "react";

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
