"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  CalendarClock,
  Kanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  Timer,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/ui/logo";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types/crm";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/leads",
    label: "Leads",
    icon: Users,
  },
  {
    href: "/pipeline",
    label: "Pipeline",
    icon: Kanban,
  },
  {
    href: "/followups",
    label: "Follow-ups",
    icon: CalendarClock,
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    href: "/ai",
    label: "AI Assistant",
    icon: Bot,
  },
  {
    href: "/deal-risk",
    label: "Deal Risk",
    icon: ShieldAlert,
  },
  {
    href: "/speed-to-lead",
    label: "Speed to Lead",
    icon: Timer,
  },
  {
    href: "/activity",
    label: "Activity",
    icon: Activity,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  link?: string | null;
};

type LeadSearchItem = {
  id: string;
  name: string;
  email: string;
  company: string;
};

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);

  const [unreadCount, setUnreadCount] = useState(0);

  const [showNotifications, setShowNotifications] =
    useState(false);

  /* ================================================================ */
  /* GLOBAL SEARCH                                                     */
  /* ================================================================ */

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    LeadSearchItem[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] =
    useState(false);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await api("/api/notifications");

        const data = response as {
          notifications?: NotificationItem[];
          unreadCount?: number;
        };

        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch (error) {
        console.error(
          "Failed to load notifications",
          error,
        );
      }
    }

    void loadNotifications();
  }, []);

  /* ================================================================ */
  /* SEARCH LEADS                                                      */
  /* ================================================================ */

  useEffect(() => {
    const query = search.trim();

    if (!query) {
      setSearchResults([]);
      setSearching(false);
      setShowSearchResults(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        setShowSearchResults(true);

        const response = await api(
          `/api/leads?q=${encodeURIComponent(
            query,
          )}&page=1&pageSize=8`,
        );

        const data = response as {
          items?: Array<{
            id: string;
            name: string;
            email: string;
            company: string;
          }>;
        };

        setSearchResults(data.items ?? []);
      } catch (error) {
        console.error(
          "Failed to search leads",
          error,
        );

        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  function openLead(id: string) {
    setSearch("");
    setSearchResults([]);
    setShowSearchResults(false);

    router.push(`/leads/${id}`);
  }

  /* ================================================================ */
  /* LOGOUT                                                            */
  /* ================================================================ */

  async function logout() {
    setLoggingOut(true);

    try {
      await api("/api/auth/logout", {
        method: "POST",
      });

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Failed to sign out",
        error,
      );

      setLoggingOut(false);
    }
  }

  /* ================================================================ */
  /* NOTIFICATION READ                                                 */
  /* ================================================================ */

  function handleNotificationRead(id: string) {
    setNotifications((current) =>
      current.map((notification) =>
        notification._id === id
          ? {
              ...notification,
              read: true,
            }
          : notification,
      ),
    );

    setUnreadCount((current) =>
      Math.max(0, current - 1),
    );
  }

  /* ================================================================ */
  /* NAVIGATION                                                         */
  /* ================================================================ */

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const active =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`);

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              active
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-white/5 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />

            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[240px_1fr]">
      {/* ============================================================ */}
      {/* DESKTOP SIDEBAR                                               */}
      {/* ============================================================ */}

      <aside className="hidden border-r border-border lg:flex lg:flex-col lg:p-4">
        <Link
          href="/dashboard"
          className="mb-8 px-2"
        >
          <Logo />
        </Link>

        {nav}

        <div className="mt-auto rounded-xl border border-border p-3">
          <p className="text-sm font-medium">
            {user.name}
          </p>

          <p className="truncate text-xs text-muted">
            {user.email}
          </p>

          <button
            onClick={logout}
            disabled={loggingOut}
            className="mt-3 flex w-full items-center gap-2 text-xs text-muted hover:text-foreground disabled:opacity-60"
          >
            <LogOut className="h-3.5 w-3.5" />

            {loggingOut
              ? "Signing out..."
              : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MAIN                                                           */}
      {/* ============================================================ */}

      <div className="flex min-w-0 flex-col">

        {/* ========================================================== */}
        {/* MOBILE HEADER                                               */}
        {/* ========================================================== */}

        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />

          <div className="flex items-center gap-2">

            {/* MOBILE NOTIFICATIONS */}

            <div className="relative">
              <button
                onClick={() =>
                  setShowNotifications(
                    (value) => !value,
                  )
                }
                className="relative rounded-lg border border-border p-2"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />

                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-background">
                    {unreadCount > 9
                      ? "9+"
                      : unreadCount}
                  </span>
                ) : null}
              </button>

              {showNotifications ? (
                <NotificationPanel
                  notifications={notifications}
                  onRead={
                    handleNotificationRead
                  }
                />
              ) : null}
            </div>

            {/* MOBILE MENU */}

            <button
              onClick={() =>
                setOpen((value) => !value)
              }
              className="rounded-lg border border-border p-2"
              aria-label="Toggle navigation"
            >
              {open ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </header>

        {/* ========================================================== */}
        {/* TOP BAR                                                      */}
        {/* ========================================================== */}

        <div className="hidden border-b border-border px-6 py-3 lg:flex lg:items-center lg:justify-between">

          {/* GLOBAL SEARCH */}

          <div className="relative w-full max-w-xl">
            <div className="flex items-center rounded-xl border border-border bg-background px-3 transition focus-within:border-accent/30">

              <Search
                className="h-4 w-4 shrink-0 text-muted"
                aria-hidden="true"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                onFocus={() => {
                  if (search.trim()) {
                    setShowSearchResults(true);
                  }
                }}
                placeholder="Search leads..."
                className="h-10 w-full bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted"
                aria-label="Search leads"
              />

              {searching ? (
                <span className="text-[10px] text-muted">
                  Searching...
                </span>
              ) : null}
            </div>

            {/* SEARCH RESULTS */}

            {showSearchResults ? (
              <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-border bg-background shadow-2xl">

                {searching ? (
                  <div className="px-4 py-5 text-center text-xs text-muted">
                    Searching leads...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-5 text-center">
                    <p className="text-sm font-medium text-foreground">
                      No leads found
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      Try a different name, email or company.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() =>
                          openLead(lead.id)
                        }
                        className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-white/5"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-semibold text-accent">
                          {lead.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {lead.name}
                          </p>

                          <p className="truncate text-xs text-muted">
                            {lead.company}
                            {lead.email
                              ? ` · ${lead.email}`
                              : ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* DESKTOP NOTIFICATIONS */}

          <div className="ml-4 shrink-0">
            <div className="relative">
              <button
                onClick={() =>
                  setShowNotifications(
                    (value) => !value,
                  )
                }
                className="relative rounded-lg border border-border p-2 text-muted transition hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />

                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-background">
                    {unreadCount > 9
                      ? "9+"
                      : unreadCount}
                  </span>
                ) : null}
              </button>

              {showNotifications ? (
                <NotificationPanel
                  notifications={notifications}
                  onRead={
                    handleNotificationRead
                  }
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* MOBILE NAVIGATION                                           */}
        {/* ========================================================== */}

        {open ? (
          <div className="border-b border-border p-4 lg:hidden">
            {nav}

            <button
              onClick={logout}
              disabled={loggingOut}
              className="mt-4 flex items-center gap-2 text-sm text-muted disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />

              {loggingOut
                ? "Signing out..."
                : "Sign out"}
            </button>
          </div>
        ) : null}

        {/* ========================================================== */}
        {/* PAGE                                                        */}
        {/* ========================================================== */}

        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* NOTIFICATION PANEL                                                     */
/* ====================================================================== */

function NotificationPanel({
  notifications,
  onRead,
}: {
  notifications: NotificationItem[];
  onRead: (id: string) => void;
}) {
  return (
    <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-border bg-background shadow-xl">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold">
          Notifications
        </p>

        <p className="text-xs text-muted">
          Recent CRM activity
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto mb-2 h-5 w-5 text-muted" />

            <p className="text-sm text-muted">
              No notifications
            </p>
          </div>
        ) : (
          notifications.map(
            (notification) => (
              <NotificationRow
                key={notification._id}
                notification={notification}
                onRead={onRead}
              />
            ),
          )
        )}
      </div>
    </div>
  );
}

/* ====================================================================== */
/* NOTIFICATION ROW                                                       */
/* ====================================================================== */

function NotificationRow({
  notification,
  onRead,
}: {
  notification: NotificationItem;
  onRead: (id: string) => void;
}) {
  const router = useRouter();

  async function handleClick() {
    if (!notification.read) {
      try {
        await api(
          `/api/notifications/${notification._id}`,
          {
            method: "PATCH",
          },
        );

        onRead(notification._id);
      } catch (error) {
        console.error(
          "Failed to mark notification as read",
          error,
        );
      }
    }

    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={!notification.link}
      className={cn(
        "block w-full border-b border-border px-4 py-3 text-left transition",
        notification.read
          ? "bg-background"
          : "bg-accent-soft/30",
        notification.link
          ? "cursor-pointer hover:bg-white/5"
          : "cursor-default",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-1 h-2 w-2 shrink-0 rounded-full",
            notification.read
              ? "bg-muted"
              : "bg-accent",
          )}
        />

        <div className="min-w-0">
          <p className="text-sm font-medium">
            {notification.title}
          </p>

          <p className="mt-1 text-xs leading-5 text-muted">
            {notification.message}
          </p>
        </div>
      </div>
    </button>
  );
}