"use client";

import { Newspaper, BookOpen, KanbanSquare, Settings, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const modules = [
  { label: "News Feed", icon: Newspaper,     href: "/",         active: true },
  { label: "Projects",  icon: KanbanSquare,  href: "/projects", active: true },
  { label: "Docs",       icon: BookOpen,     href: "/docs",     active: true },
  { label: "Chelsea FC", icon: Trophy,       href: "/chelsea",  active: true },
  //{ label: "Memories",  icon: BrainCircuit,  href: "/memories", active: false },
  { label: "Settings",   icon: Settings,     href: "/settings", active: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 bg-gray-950 border-r border-gray-800 flex flex-col py-3 shrink-0">
      {modules.map(({ label, icon: Icon, href, active }) => {
        const isCurrent = pathname === href || (href !== "/" && pathname.startsWith(href));
        const isComingSoon = !active;

        return (
          <div key={label}>
            {isComingSoon ? (
              <div className="flex items-center gap-3 px-4 py-2 text-gray-600 cursor-not-allowed select-none">
                <Icon size={15} />
                <span className="text-sm">{label}</span>
              </div>
            ) : (
              <Link
                href={href}
                className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                  isCurrent
                    ? "text-emerald-400 bg-gray-900"
                    : "text-gray-400 hover:text-gray-100 hover:bg-gray-900"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </aside>
  );
}
