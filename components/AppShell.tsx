import type { ReactNode } from "react";
import { SidebarNav } from "./SidebarNav";

type Props = {
  title?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, rightSlot, children }: Props) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: "1fr",
        maxWidth: 720,
        margin: "0 auto",
        padding: 16,
        gap: 12,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{title ?? "Captain Boris"}</div>
          <div className="cb-muted" style={{ fontSize: 12 }}>Mobile-first health log</div>
        </div>
        <div>{rightSlot}</div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <aside className="cb-card cb-glass" style={{ padding: 12 }}>
          <SidebarNav compact />
        </aside>

        <main style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</main>
      </div>
    </div>
  );
}