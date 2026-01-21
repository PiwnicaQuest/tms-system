"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Truck,
  Users,
  ClipboardList,
  Receipt,
  Calculator,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  MapPin,
  FileSpreadsheet,
  Download,
  Calendar,
  Code,
  Webhook,
  Shield,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Building2, Container } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  hasBadge?: boolean;
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Zlecenia", href: "/orders", icon: ClipboardList },
  { name: "Kalendarz", href: "/calendar", icon: Calendar },
  { name: "Notatki", href: "/notes", icon: MessageSquare, hasBadge: true },
  { name: "Pojazdy", href: "/vehicles", icon: Truck },
  { name: "Mapa GPS", href: "/gps", icon: MapPin },
  { name: "Naczepy", href: "/trailers", icon: Container },
  { name: "Kierowcy", href: "/drivers", icon: Users },
  { name: "Kontrahenci", href: "/contractors", icon: Building2 },
  { name: "Rozliczenia", href: "/costs", icon: Calculator },
  { name: "Faktury", href: "/invoices", icon: Receipt },
  { name: "Raporty", href: "/reports", icon: BarChart3 },
  { name: "Dokumenty", href: "/documents", icon: FileText },
  { name: "Import CSV", href: "/import", icon: FileSpreadsheet },
  { name: "Eksport FK", href: "/export", icon: Download },
  { name: "Ustawienia", href: "/settings", icon: Settings },
  { name: "Webhooki", href: "/webhooks", icon: Webhook, roles: ["ADMIN", "SUPER_ADMIN"] },
  { name: "Logi audytowe", href: "/audit-logs", icon: Shield, roles: ["ADMIN", "SUPER_ADMIN"] },
  { name: "API Docs", href: "/api-docs", icon: Code, roles: ["ADMIN", "SUPER_ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadNotesCount, setUnreadNotesCount] = useState(0);
  const { data: session } = useSession();
  const userRole = session?.user?.role;

  // Fetch unread notes count
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const response = await fetch("/api/notes/unread-count");
        if (response.ok) {
          const data = await response.json();
          setUnreadNotesCount(data.count);
        }
      } catch (error) {
        console.error("Error fetching unread notes count:", error);
      }
    }

    if (session?.user) {
      fetchUnreadCount();
      // Refresh every 60 seconds
      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [session?.user]);

  // Filter navigation items based on user role
  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true;
    return userRole && item.roles.includes(userRole);
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Bakus TMS</span>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Truck className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {filteredNavigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const showBadge = item.hasBadge && item.href === "/notes" && unreadNotesCount > 0;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.name : undefined}
            >
              <div className="relative">
                <item.icon className="h-5 w-5 shrink-0" />
                {showBadge && collapsed && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadNotesCount > 9 ? "9+" : unreadNotesCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.name}</span>
                  {showBadge && (
                    <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-xs">
                      {unreadNotesCount > 99 ? "99+" : unreadNotesCount}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      <div className="absolute bottom-4 left-0 right-0 px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
