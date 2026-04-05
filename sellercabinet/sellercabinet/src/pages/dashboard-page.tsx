import type React from "react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { Clock3, LoaderCircle, PackageCheck, PackageSearch, Store } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime, formatMoney, orderStatusMeta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/providers/auth-provider";
import { useMerchantWorkspace } from "@/providers/merchant-workspace-provider";

export function DashboardPage() {
  const { session } = useAuth();
  const { workspace } = useMerchantWorkspace();

  const ordersQuery = useQuery({
    queryKey: ["merchant", "orders", "board"],
    queryFn: () => api.getOrderBoard(session!.accessToken),
  });

  const stats = useMemo(() => {
    const orders = ordersQuery.data ?? [];

    return {
      totalOrders: orders.length,
      revenue: orders.reduce((sum, order) => sum + order.totalAmountMinor, 0),
      assembling: orders.filter((order) => order.status === "ASSEMBLING").length,
      pending: orders.filter((order) => order.status === "AWAITING_STORE_CONFIRMATION").length,
      ready: orders.filter((order) => order.status === "READY_FOR_PICKUP").length,
    };
  }, [ordersQuery.data]);

  const chartData = useMemo(() => {
    return (ordersQuery.data ?? [])
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((order, index) => ({
        name: `#${order.id}`,
        total: Number((order.totalAmountMinor / 100).toFixed(2)),
        index: index + 1,
      }));
  }, [ordersQuery.data]);

  const recentOrders = useMemo(
    () =>
      (ordersQuery.data ?? [])
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5),
    [ordersQuery.data],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          icon={PackageSearch}
          title="Новые заказы"
          value={stats.pending}
          hint="Требуют реакции магазина"
          accent="bg-amber-100"
        />
        <MetricCard
          icon={Clock3}
          title="Сборка"
          value={stats.assembling}
          hint="На линии подготовки"
          accent="bg-orange-100"
        />
        <MetricCard
          icon={PackageCheck}
          title="Готово к выдаче"
          value={stats.ready}
          hint="Ожидает курьера"
          accent="bg-lime-100"
        />
        <MetricCard
          icon={Store}
          title="Оборот по доске"
          value={formatMoney(stats.revenue)}
          hint={`${stats.totalOrders} заказов в выборке`}
          accent="bg-primary/20"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Динамика заказов</CardTitle>
            <CardDescription>
              Визуальный срез по текущей доске заказов merchant-кабинета.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {ordersQuery.isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Загружаем дашборд...
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="yellowArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#facc15" stopOpacity={0.65} />
                      <stop offset="95%" stopColor="#facc15" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#eadfbe" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: number) => formatMoney(Math.round(value * 100))}
                    contentStyle={{
                      borderRadius: "20px",
                      border: "1px solid rgba(238, 213, 147, 0.85)",
                      backgroundColor: "rgba(255,255,255,0.96)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#ca8a04"
                    fillOpacity={1}
                    fill="url(#yellowArea)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyHint text="Пока нет заказов. Как только покупатели начнут оформлять заказы, здесь появится живая картина по обороту." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Операционный контур</CardTitle>
            <CardDescription>
              Что уже заведено в кабинете и где узкие места на текущий момент.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <StatusRow label="Филиалы в кабинете" value={`${workspace.branches.length}`} />
            <StatusRow label="Товарные позиции" value={`${workspace.products.length}`} />
            <StatusRow label="Складские приходы" value={`${workspace.receipts.length}`} />
            <Separator />
            <div className="rounded-3xl bg-secondary/70 p-4">
              <p className="text-sm font-semibold">Текущее ограничение backend API</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Merchant API пока не отдает отдельные списки филиалов и товаров обратно через
                `GET`. Поэтому кабинет сохраняет эти сущности локально после успешного
                серверного создания, чтобы не ломать рабочий процесс.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние изменения по заказам</CardTitle>
          <CardDescription>
            Быстрый обзор по недавно обновленным заказам из доски магазина.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-white/85 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold">Заказ #{order.id}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{order.deliveryAddress}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={orderStatusMeta[order.status].tone}>
                    {orderStatusMeta[order.status].label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatMoney(order.totalAmountMinor)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(order.updatedAt)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <EmptyHint text="На доске пока нет заказов для отображения." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  hint: string;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-6">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
        </div>
        <div className={`rounded-2xl p-3 ${accent}`}>
          <Icon className="h-6 w-6 text-stone-900" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-border bg-secondary/35 p-6 text-center text-sm leading-6 text-muted-foreground">
      {text}
    </div>
  );
}
