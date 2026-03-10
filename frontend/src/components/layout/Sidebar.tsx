"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Search, Palette, LineChart, CalendarDays,
  FileText, Share2, Mail, BarChart3, Zap, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard",           href: "/",                    icon: LayoutDashboard },
  { label: "Market Intelligence", href: "/market-intelligence", icon: Search },
  { label: "Branding",            href: "/branding",            icon: Palette },
  { label: "Research",            href: "/research",            icon: LineChart },
  { label: "Strategy",            href: "/strategy",            icon: CalendarDays },
  { label: "Content",             href: "/content",             icon: FileText },
  { label: "Social Media",        href: "/social",              icon: Share2 },
  { label: "Email",               href: "/email",               icon: Mail },
  { label: "Analytics",           href: "/analytics",           icon: BarChart3 },
  { label: "Optimization",        href: "/optimization",        icon: Zap },
  { label: "Settings",            href: "/settings",            icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-gray-900 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm leading-tight">
            AI Marketing<br />Team
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-gray-500 text-xs">AI Marketing Team v1.0</p>
      </div>
    </aside>
  );
}
