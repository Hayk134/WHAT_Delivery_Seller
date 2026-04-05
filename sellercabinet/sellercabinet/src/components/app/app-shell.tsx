import { Link, NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  Building2,
  Boxes,
  LayoutDashboard,
  LogOut,
  MapPinHouse,
  PackageOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import {
  MerchantWorkspaceProvider,
  useMerchantWorkspace,
} from "@/providers/merchant-workspace-provider";

const navItems = [
  { to: "/", label: "Обзор", icon: LayoutDashboard },
  { to: "/orders", label: "Заказы", icon: Boxes },
  { to: "/branches", label: "Филиалы", icon: MapPinHouse },
  { to: "/products", label: "Номенклатура", icon: PackageOpen },
  { to: "/stock", label: "Склад", icon: BarChart3 },
  { to: "/organization", label: "Организация", icon: Building2 },
];

function Sidebar() {
  const { profile, session, logout } = useAuth();
  const { workspace } = useMerchantWorkspace();

  return (
    <aside className="glass-card sticky top-6 hidden h-[calc(100vh-3rem)] w-72 shrink-0 flex-col rounded-[32px] border border-white/70 px-5 py-6 shadow-panel lg:flex">
      <Link to="/" className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-lg font-semibold">SellerCabinet</p>
          <p className="text-sm text-muted-foreground">Кабинет торговой сети</p>
        </div>
      </Link>

      <div className="mb-6 rounded-[28px] bg-gradient-to-br from-primary/90 via-amber-300 to-amber-200 p-5 text-primary-foreground shadow-soft">
        <p className="text-xs uppercase tracking-[0.24em] text-primary-foreground/75">
          Активный профиль
        </p>
        <p className="mt-3 text-lg font-semibold">{profile?.fullName}</p>
        <p className="text-sm text-primary-foreground/80">{profile?.email}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className="border-white/30 bg-white/20 text-primary-foreground">
            org #{session?.organizationId}
          </Badge>
          <Badge className="border-white/30 bg-white/20 text-primary-foreground">
            {workspace.branches.length} филиалов
          </Badge>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition",
                isActive
                  ? "bg-stone-950 text-white shadow-soft"
                  : "hover:bg-white/80 hover:text-foreground",
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Button variant="outline" className="mt-6 w-full justify-start" onClick={logout}>
        <LogOut className="h-4 w-4" />
        Выйти
      </Button>
    </aside>
  );
}

function Topbar() {
  const { profile } = useAuth();
  const { workspace } = useMerchantWorkspace();

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[30px] border border-white/70 bg-white/70 p-5 shadow-soft md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-amber-700">
          Операционный контур
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Управление доставкой для {profile?.fullName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Единое окно для филиалов, ассортимента, склада и живой обработки заказов по
          организации.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-accent px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-800">Филиалы</p>
          <p className="mt-2 text-2xl font-semibold">{workspace.branches.length}</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Товары</p>
          <p className="mt-2 text-2xl font-semibold">{workspace.products.length}</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Приходы</p>
          <p className="mt-2 text-2xl font-semibold">{workspace.receipts.length}</p>
        </div>
      </div>
    </div>
  );
}

function MobileNav() {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto rounded-[26px] border border-white/70 bg-white/80 p-2 shadow-soft lg:hidden">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition",
              isActive ? "bg-stone-950 text-white" : "bg-transparent hover:bg-secondary",
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

function AppShellContent() {
  return (
    <div className="page-shell mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6 xl:px-8">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <MobileNav />
        <Topbar />
        <Outlet />
      </main>
    </div>
  );
}

export function AppShell() {
  const { session } = useAuth();

  if (!session?.organizationId) {
    return null;
  }

  return (
    <MerchantWorkspaceProvider
      organizationId={session.organizationId}
      token={session.accessToken}
    >
      <AppShellContent />
    </MerchantWorkspaceProvider>
  );
}
