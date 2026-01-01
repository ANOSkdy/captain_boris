"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement, RefObject } from "react";
import { DumbbellIcon } from "./icons/DumbbellIcon";
import { HomeIcon } from "./icons/HomeIcon";
import { MoonIcon } from "./icons/MoonIcon";
import { ScaleIcon } from "./icons/ScaleIcon";
import { JournalIcon } from "./icons/JournalIcon";
import { UtensilsIcon } from "./icons/UtensilsIcon";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactElement;
};

type Props = {
  onNavigate?: () => void;
  initialFocusRef?: RefObject<HTMLAnchorElement | null>;
};

const items: NavItem[] = [
  { href: "/home", label: "ホーム", icon: <HomeIcon className="nav-icon" /> },
  { href: "/weight", label: "体重", icon: <ScaleIcon className="nav-icon" /> },
  { href: "/sleep", label: "睡眠", icon: <MoonIcon className="nav-icon" /> },
  { href: "/eat", label: "食事", icon: <UtensilsIcon className="nav-icon" /> },
  { href: "/workout", label: "ワークアウト", icon: <DumbbellIcon className="nav-icon" /> },
  { href: "/journal", label: "ジャーナル", icon: <JournalIcon className="nav-icon" /> },
];

export function SidebarNav({ onNavigate, initialFocusRef }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label="主要ナビゲーション" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item, idx) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${active ? "is-active" : ""}`.trim()}
            onClick={onNavigate}
            ref={idx === 0 ? initialFocusRef : undefined}
          >
            {item.icon}
            <span style={{ fontWeight: active ? 700 : 600 }}>{item.label}</span>
            <span className="nav-chevron" aria-hidden>
              {active ? "•" : "›"}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
