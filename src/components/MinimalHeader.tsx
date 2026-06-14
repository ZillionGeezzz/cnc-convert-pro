import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeftRight,
  Wrench,
  Monitor,
  LogOut,
  Menu,
  X,
  Cpu,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/converter", label: "Converter", icon: ArrowLeftRight },
  { path: "/tools", label: "Tool Library", icon: Wrench },
  { path: "/machines", label: "Machines", icon: Monitor },
];

export function MinimalHeader() {
  const { isAuthenticated, signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/88 shadow-[0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl dark:shadow-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/")}
              className="group flex items-center gap-2.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
              aria-label="Go to home"
            >
              <span className="flex size-9 items-center justify-center rounded-lg border border-primary/18 bg-primary/10 text-primary shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Cpu className="size-4" />
              </span>
              <span className="hidden sm:inline tracking-tight">
                CNC Transpiler
              </span>
            </button>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-md border border-transparent px-3 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      isActive
                        ? "border-primary/15 bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {user?.name || user?.email || "Guest"}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => signOut()}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Sign out"
                >
                  <LogOut data-icon />
                </Button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-md border border-border/70 p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              {mobileOpen ? (
                <X className="size-4" />
              ) : (
                <Menu className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-border bg-background md:hidden"
        >
          <div className="flex flex-col gap-1 px-4 py-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
            {isAuthenticated && (
              <>
                <Separator className="my-2" />
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
