import Link from "next/link";

type Props = {
  compact?: boolean;
};

const items = [
  { href: "/home", label: "Home" },
  { href: "/weight", label: "Weight" },
  { href: "/sleep", label: "Sleep" },
  { href: "/eat", label: "Eat" },
  { href: "/workout", label: "Workout" },
];

export function SidebarNav({ compact = false }: Props) {
  return (
    <nav aria-label="Primary" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          style={{
            minHeight: "var(--tap)",
            display: "flex",
            alignItems: "center",
            padding: compact ? "10px 10px" : "10px 12px",
            borderRadius: "var(--radius)",
            border: "1px solid transparent",
            background: "transparent",
          }}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}