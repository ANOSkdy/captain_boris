import type { ReactNode } from "react";

type Props = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  subtitle?: string;
};

export function CollapsibleSection({ title, subtitle, defaultOpen = false, children }: Props) {
  return (
    <details open={defaultOpen} style={{ marginTop: 12 }}>
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 12px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--card-border)",
          background: "var(--card-bg)",
        }}
      >
        <span style={{ fontWeight: 700 }}>{title}</span>
        {subtitle ? <span className="cb-muted" style={{ fontSize: 12 }}>{subtitle}</span> : null}
      </summary>

      <div style={{ padding: "12px 2px 2px" }}>{children}</div>
    </details>
  );
}