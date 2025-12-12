import type { SVGProps } from "react";

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" {...props}>
      <path
        d="M5 10.5 12 5l7 5.5V19a1 1 0 0 1-1 1h-4.5v-4.5h-3V20H6a1 1 0 0 1-1-1z"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
