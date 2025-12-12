"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "./icons/ChevronDownIcon";

type Props = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  collapsedSummary?: ReactNode;
};

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  collapsedSummary,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className="collapsible" aria-live="polite">
      <button
        type="button"
        className="collapsible__header"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="collapsible__title">
          <span style={{ fontWeight: 700 }}>{title}</span>
          {subtitle ? <span className="collapsible__summary">{subtitle}</span> : null}
          {!open && collapsedSummary ? (
            <span className="pill" aria-hidden>
              {collapsedSummary}
            </span>
          ) : null}
        </div>
        <ChevronDownIcon
          className="nav-icon"
          aria-hidden
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 160ms ease" }}
        />
      </button>
      <div
        id={panelId}
        className="collapsible__content"
        hidden={!open}
        role="region"
        aria-label={`${title} content`}
      >
        {children}
      </div>
    </section>
  );
}
