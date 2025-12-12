import type { SVGProps } from "react";

export function ScaleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" {...props}>
      <rect x="4" y="5" width="16" height="14" rx="3" stroke="currentColor" strokeWidth={2} />
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth={2} />
      <path d="M12 8v2" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
