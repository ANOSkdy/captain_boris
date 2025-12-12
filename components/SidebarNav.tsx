"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DumbbellIcon } from "./icons/DumbbellIcon";
import { HomeIcon } from "./icons/HomeIcon";
import { MoonIcon } from "./icons/MoonIcon";
import { ScaleIcon } from "./icons/ScaleIcon";
import { UtensilsIcon } from "./icons/UtensilsIcon";

export type NavItem = {
  href: string;
  label: string;
  icon: JSX.Element;
};

type Props = {
  onNavigate?: () => void;
  initialFocusRef?: React.RefObject<HTMLAnchorElement | null>;
};

const items: NavItem[] = [
  { href: "/home", label: "Home", icon: <HomeIcon className="nav-icon" /> },
  { href: "/weight", label: "Weight", icon: <ScaleIcon className="nav-icon" /> },
  { href: "/sleep", label: "Sleep", icon: <MoonIcon className="nav-icon" /> },
  { href: "/eat", label: "Eat", icon: <UtensilsIcon className="nav-icon" /> },
  { href: "/workout", label: "Workout", icon: <DumbbellIcon className="nav-icon" /> },
];

export function SidebarNav({ onNavigate, initialFocusRef }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
