"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { CloseIcon } from "./icons/CloseIcon";
import { MenuIcon } from "./icons/MenuIcon";
import { SidebarNav } from "./SidebarNav";

type Props = {
  title?: string;
  rightSlot?: ReactNode;
  actionSlot?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title = "キャプテン・ボリス", rightSlot, actionSlot, children }: Props) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstNavRef = useRef<HTMLAnchorElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }

      if (!open || e.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")
      ).filter((el) => !el.hasAttribute("aria-hidden"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      firstNavRef.current?.focus();
    }
  }, [open]);

  const overlay = useMemo(
    () => (open ? <div className="drawer-overlay" role="presentation" onClick={() => setOpen(false)} /> : null),
    [open]
  );

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-row">
          <button
            type="button"
            className="icon-button app-shell__menu-btn"
            aria-label="メニューを開く"
            onClick={() => setOpen((v) => !v)}
            ref={menuButtonRef}
          >
            <MenuIcon className="nav-icon" />
          </button>

          <div className="app-shell__title">
            <h1>{title}</h1>
          </div>

          <div className="app-shell__actions">
            {rightSlot}
            {actionSlot}
          </div>
        </div>
      </header>

      <div className="app-shell__body">
        <aside ref={drawerRef} className={`app-shell__sidebar ${open ? "is-open" : ""}`.trim()}>
          <div className="app-shell__sidebar-header">
            <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>キャプテン・ボリス</div>
            <button
              type="button"
              className="icon-button icon-button--ghost app-shell__menu-btn"
              aria-label="メニューを閉じる"
              onClick={() => {
                setOpen(false);
                menuButtonRef.current?.focus();
              }}
            >
              <CloseIcon className="nav-icon" />
            </button>
          </div>
          <SidebarNav onNavigate={() => setOpen(false)} initialFocusRef={firstNavRef} />
        </aside>

        <main className="app-shell__main" role="main">
          {children}
        </main>
      </div>

      {overlay}
    </div>
  );
}
