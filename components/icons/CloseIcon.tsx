import type { SVGProps } from "react";

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false" {...props}>
      <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
