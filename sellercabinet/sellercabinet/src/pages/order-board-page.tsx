import type React from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  LoaderCircle,
  MapPinned,
  PackageCheck,
  PackageOpen,
  Search,
  Store,
  Truck,
  Waves,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  formatMeasure,
  formatMoney,
  formatRelative,
  orderStatusMeta,
} from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useOrderRealtime } from "@/hooks/use-order-realtime";
import type { OrderResponse } from "@/types/api";

const columns = [
  {
    status: "AWAITING_STORE_CONFIRMATION",
    title: "Новые",
    hint: "Ждут подтверждения магазина",
  },
  {
    status: "ASSEMBLING",
    title: "Сборка",
    hint: "Заказы в работе у магазина",
  },
  {
    status: "READY_FOR_PICKUP",
    title: "Готовы",
    hint: "Можно передавать курьеру",
  },
  {
    status: "COURIER_ASSIGNED",
    title: "Курьер",
    hint: "Курьер назначен и едет",
  },
  {
    status: "ON_THE_WAY",
    title: "В пути",
    hint: "Заказ уже у клиента на маршруте",
  },
] as const;

export function OrderBoardPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const ordersQuery = useQuery({
    queryKey: ["merchant", "orders", "board"],
    queryFn: () => api.getOrderBoard(session!.accessToken),
  });

  const locations = useOrderRealtime(ordersQuery.data, session?.accessToken ?? null, true);

  const filteredOrders = useMemo(() => {
    const orders = ordersQuery.data ?? [];
    const needle = search.trim().toLowerCase();

    const nextOrders = needle
      ? orders.filter(
          (order) =>
            String(order.id).includes(needle) ||
            order.deliveryAddress.toLowerCase().includes(needle) ||
            order.branchName.toLowerCase().includes(needle) ||
            order.items.some((item) => item.productName.toLowerCase().includes(needle)),
        )
      : orders;

    return nextOrders
      .slice()
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  }, [ordersQuery.data, search]);

  const selectedOrder =
    filteredOrders.find((order) => order.id === selectedOrderId) ?? filteredOrders[0] ?? null;

  const boardStats = useMemo(() => {
    const readyForAction = filteredOrders.filter((order) =>
      ["AWAITING_STORE_CONFIRMATION", "COURIER_ASSIGNED"].includes(order.status),
    ).length;

    return {
      total: filteredOrders.length,
      readyForAction,
      liveCouriers: Object.keys(locations).length,
      revenue: filteredOrders.reduce((sum, order) => sum + order.totalAmountMinor, 0),
    };
  }, [filteredOrders, locations]);

  const updateOrderInCache = (order: OrderResponse) => {
    queryClient.setQueryData<OrderResponse[]>(["merchant", "orders", "board"], (current) => {
      if (!current) {
        return [order];
      }

      return current.map((item) => (item.id === order.id ? order : item));
    });
  };

  const confirmMutation = useMutation({
    mutationFn: (orderId: number) => api.confirmOrder(session!.accessToken, orderId),
    onSuccess: (order) => {
      updateOrderInCache(order);
      toast.success(`Заказ #${order.id} подтверждён`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Не удалось подтвердить заказ"),
  });

  const assemblingMutation = useMutation({
    mutationFn: (orderId: number) => api.markOrderAssembling(session!.accessToken, orderId),
    onSuccess: (order) => {
      updateOrderInCache(order);
      toast.success(`Заказ #${order.id} переведён в сборку`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Не удалось изменить статус"),
  });

  const readyMutation = useMutation({
    mutationFn: (orderId: number) => api.markOrderReady(session!.accessToken, orderId),
    onSuccess: (order) => {
      updateOrderInCache(order);
      toast.success(`Заказ #${order.id} готов к выдаче`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Не удалось отметить заказ как готовый"),
  });

  const handoffMutation = useMutation({
    mutationFn: (orderId: number) => api.handOffOrder(session!.accessToken, orderId),
    onSuccess: (order) => {
      updateOrderInCache(order);
      toast.success(`Заказ #${order.id} передан курьеру`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Не удалось передать заказ"),
  });

  const isBusy =
    confirmMutation.isPending ||
    assemblingMutation.isPending ||
    readyMutation.isPending ||
    handoffMutation.isPending;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(400px,0.92fr)]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Живая доска заказов</CardTitle>
                <CardDescription className="mt-2 max-w-2xl">
                  Операторский канбан по активным заказам с быстрым поиском, видимым next step и
                  realtime-сигналами по курьеру.
                </CardDescription>
              </div>
              <Badge className="w-fit border-emerald-200 bg-emerald-100 text-emerald-900">
                <Waves className="mr-1 h-3.5 w-3.5" />
                Live board
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <BoardStat
                title="На доске"
                value={boardStats.total.toString()}
                hint="Активные заказы в текущем фильтре"
                tone="bg-stone-950 text-white"
                icon={PackageOpen}
              />
              <BoardStat
                title="Требуют действия"
                value={boardStats.readyForAction.toString()}
                hint="Нужно подтвердить или передать"
                tone="bg-amber-100 text-amber-950"
                icon={ArrowRight}
              />
              <BoardStat
                title="Курьер онлайн"
                value={boardStats.liveCouriers.toString()}
                hint="Есть live-координаты по заказу"
                tone="bg-sky-100 text-sky-950"
                icon={Truck}
              />
              <BoardStat
                title="Сумма на доске"
                value={formatMoney(boardStats.revenue)}
                hint="Оборот активной выборки"
                tone="bg-lime-100 text-lime-950"
                icon={Store}
              />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="bg-white/85">
                  {filteredOrders.length} заказов
                </Badge>
                <Badge variant="outline" className="bg-white/85">
                  Обновление без перезагрузки
                </Badge>
              </div>
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="ID, адрес, филиал или товар"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {ordersQuery.isLoading ? (
            <div className="flex h-72 items-center justify-center text-muted-foreground">
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Загружаем заказы...
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="board-scroll max-h-[78vh] overflow-auto pb-3 pr-3">
              <div className="grid min-w-[1800px] grid-cols-5 gap-5">
                {columns.map((column) => {
                  const list = filteredOrders.filter((order) => order.status === column.status);

                  return (
                    <section
                      key={column.status}
                      className="flex min-h-[820px] min-w-[340px] flex-col rounded-[30px] border border-border/70 bg-secondary/40 p-4"
                    >
                      <div className="mb-4 rounded-[24px] bg-white/80 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold">{column.title}</p>
                            <p className="mt-1 text-sm leading-5 text-muted-foreground">
                              {column.hint}
                            </p>
                          </div>
                          <Badge className={cn("shrink-0", orderStatusMeta[column.status].tone)}>
                            {list.length}
                          </Badge>
                        </div>
                      </div>

                      <div className="board-scroll flex-1 space-y-3 overflow-y-auto pr-1">
                        {list.length > 0 ? (
                          list.map((order) => (
                            <OrderTile
                              key={order.id}
                              order={order}
                              isSelected={selectedOrder?.id === order.id}
                              hasCourierSignal={Boolean(locations[order.id])}
                              onSelect={() => setSelectedOrderId(order.id)}
                              onConfirmHandoff={
                                order.status === "COURIER_ASSIGNED"
                                  ? () => handoffMutation.mutate(order.id)
                                  : undefined
                              }
                              isActionBusy={handoffMutation.isPending}
                            />
                          ))
                        ) : (
                          <div className="rounded-[24px] border border-dashed border-border bg-white/65 p-5 text-sm text-muted-foreground">
                            В колонке пока пусто.
                          </div>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-[30px] border border-dashed border-border bg-secondary/40 p-10 text-center text-sm leading-6 text-muted-foreground">
              По текущему фильтру заказы не найдены.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="xl:sticky xl:top-6">
        <CardHeader>
          <CardTitle>Карточка заказа</CardTitle>
          <CardDescription>
            Ключевые данные, состав, история и действие магазина по выбранному заказу.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {selectedOrder ? (
            <>
              <div className="rounded-[30px] bg-stone-950 p-5 text-white">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                        Заказ #{selectedOrder.id}
                      </p>
                      <p className="mt-3 text-3xl font-semibold">
                        {formatMoney(selectedOrder.totalAmountMinor)}
                      </p>
                      <p className="mt-2 text-sm text-white/70">
                        {getActionHint(selectedOrder)}
                      </p>
                    </div>
                    <Badge className={cn("w-fit", orderStatusMeta[selectedOrder.status].tone)}>
                      {orderStatusMeta[selectedOrder.status].label}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <HeroMeta
                      label="Создан"
                      value={formatDateTime(selectedOrder.createdAt)}
                      caption={formatRelative(selectedOrder.createdAt)}
                    />
                    <HeroMeta
                      label="Последнее обновление"
                      value={formatDateTime(selectedOrder.updatedAt)}
                      caption={formatRelative(selectedOrder.updatedAt)}
                    />
                  </div>
                </div>
              </div>

              <ActionStrip
                order={selectedOrder}
                onConfirm={() => confirmMutation.mutate(selectedOrder.id)}
                onAssembling={() => assemblingMutation.mutate(selectedOrder.id)}
                onReady={() => readyMutation.mutate(selectedOrder.id)}
                onHandOff={() => handoffMutation.mutate(selectedOrder.id)}
                isBusy={isBusy}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailCard
                  label="Филиал"
                  value={selectedOrder.branchName}
                  hint={`#${selectedOrder.branchId}`}
                />
                <DetailCard
                  label="Курьер"
                  value={selectedOrder.courier?.courierName ?? "Не назначен"}
                  hint={
                    selectedOrder.courier
                      ? `ID ${selectedOrder.courier.courierId}`
                      : "Передача будет доступна после назначения"
                  }
                />
                <DetailCard
                  label="Позиций"
                  value={selectedOrder.items.length.toString()}
                  hint={selectedOrder.items
                    .reduce((sum, item) => sum + item.quantity, 0)
                    .toLocaleString("ru-RU")}
                />
                <DetailCard
                  label="Комментарий клиента"
                  value={selectedOrder.customerComment ? "Есть комментарий" : "Без комментария"}
                  hint={selectedOrder.customerComment ?? "Дополнительных пожеланий нет"}
                />
              </div>

              <div className="rounded-[28px] border border-border/70 bg-white/85 p-5">
                <div className="flex items-center gap-2">
                  <MapPinned className="h-4 w-4 text-amber-700" />
                  <p className="font-semibold">Доставка</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {selectedOrder.deliveryAddress}
                </p>
                {selectedOrder.customerComment ? (
                  <div className="mt-4 rounded-2xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
                    {selectedOrder.customerComment}
                  </div>
                ) : null}
                {locations[selectedOrder.id] ? (
                  <div className="mt-4 flex items-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
                    <Waves className="h-4 w-4" />
                    Курьер онлайн: {locations[selectedOrder.id].lat.toFixed(4)},{" "}
                    {locations[selectedOrder.id].lng.toFixed(4)}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-border/70 bg-white/85 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">Состав заказа</p>
                  <Badge variant="outline" className="bg-white">
                    {selectedOrder.items.length} поз.
                  </Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={`${selectedOrder.id}-${item.productId}`}
                      className="rounded-[22px] bg-secondary/45 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{item.productName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatMeasure(item.quantity, item.measure)}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold">
                          {formatMoney(item.lineTotalMinor)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 text-sm">
                  <SummaryRow
                    label="Товары"
                    value={formatMoney(selectedOrder.subtotalMinor)}
                  />
                  <SummaryRow
                    label="Доставка"
                    value={formatMoney(selectedOrder.deliveryFeeMinor)}
                  />
                  <SummaryRow
                    label="Итого"
                    value={formatMoney(selectedOrder.totalAmountMinor)}
                    emphasized
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-border/70 bg-white/85 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">История статусов</p>
                  <Badge variant="outline" className="bg-white">
                    {selectedOrder.history.length}
                  </Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedOrder.history
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <div key={`${entry.changedAt}-${index}`} className="flex gap-3">
                        <div className="mt-1 flex flex-col items-center">
                          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                          {index !== selectedOrder.history.length - 1 ? (
                            <div className="mt-1 h-full w-px bg-border" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1 rounded-[22px] bg-secondary/45 px-4 py-3">
                          <p className="text-sm font-semibold">
                            {orderStatusMeta[entry.status].label}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {entry.changedBy} • {formatDateTime(entry.changedAt)}
                          </p>
                          {entry.note ? (
                            <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[30px] border border-dashed border-border bg-secondary/40 p-10 text-center text-sm leading-6 text-muted-foreground">
              Выберите заказ на доске слева, чтобы увидеть детали.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrderTile({
  order,
  isSelected,
  hasCourierSignal,
  onSelect,
  onConfirmHandoff,
  isActionBusy,
}: {
  order: OrderResponse;
  isSelected: boolean;
  hasCourierSignal: boolean;
  onSelect: () => void;
  onConfirmHandoff?: () => void;
  isActionBusy: boolean;
}) {
  return (
    <button
      className={cn(
        "w-full rounded-[24px] border p-4 text-left transition-all",
        isSelected
          ? "border-primary bg-white shadow-soft ring-2 ring-primary/20"
          : "border-white/70 bg-white/80 hover:border-primary/35 hover:bg-white",
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">#{order.id}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatRelative(order.updatedAt)}</p>
        </div>
        <Badge className={cn("shrink-0", orderStatusMeta[order.status].tone)}>
          {orderStatusMeta[order.status].shortLabel}
        </Badge>
      </div>

      <p className="mt-3 text-sm font-medium text-foreground">{formatMoney(order.totalAmountMinor)}</p>

      <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
        {order.deliveryAddress}
      </p>

      <div className="mt-4 grid grid-cols-[minmax(0,1.7fr)_minmax(86px,0.7fr)] gap-2">
        <TileMeta label="Филиал" value={order.branchName} />
        <TileMeta label="Позиций" value={order.items.length.toString()} compact />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className="bg-white">
          {formatDateTime(order.createdAt)}
        </Badge>
        {order.courier ? (
          <Badge variant="outline" className="bg-white">
            Курьер: {order.courier.courierName}
          </Badge>
        ) : null}
        {hasCourierSignal ? (
          <Badge className="border-sky-200 bg-sky-100 text-sky-900">Курьер онлайн</Badge>
        ) : null}
      </div>

      {order.status === "COURIER_ASSIGNED" ? (
        <div className="mt-4">
          <Button
            size="sm"
            className="w-full"
            disabled={isActionBusy || !order.courier}
            onClick={(event) => {
              event.stopPropagation();
              onConfirmHandoff?.();
            }}
          >
            {isActionBusy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Truck className="h-4 w-4" />
            )}
            {order.courier
              ? "Подтвердить передачу курьеру"
              : "Ждём назначения курьера"}
          </Button>
        </div>
      ) : null}
    </button>
  );
}

function ActionStrip({
  order,
  onConfirm,
  onAssembling,
  onReady,
  onHandOff,
  isBusy,
}: {
  order: OrderResponse;
  onConfirm: () => void;
  onAssembling: () => void;
  onReady: () => void;
  onHandOff: () => void;
  isBusy: boolean;
}) {
  if (order.status === "AWAITING_STORE_CONFIRMATION") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Button onClick={onConfirm} disabled={isBusy} size="lg">
          {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
          Подтвердить заказ
        </Button>
        <Button variant="outline" onClick={onAssembling} disabled={isBusy} size="lg">
          Начать сборку вручную
        </Button>
      </div>
    );
  }

  if (order.status === "ASSEMBLING") {
    return (
      <Button onClick={onReady} disabled={isBusy} size="lg" className="w-full">
        {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
        Отметить как готовый
      </Button>
    );
  }

  if (order.status === "COURIER_ASSIGNED") {
    return (
      <div className="space-y-2">
        <Button onClick={onHandOff} disabled={isBusy || !order.courier} size="lg" className="w-full">
          {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
          {order.courier
            ? "??????????? ???????? ???????"
            : "???? ?????????? ???????"}
        </Button>
        {!order.courier ? (
          <p className="text-sm text-muted-foreground">
            ?????? ?????? ????????, ????? backend ???????? ??????? ?? ?????.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-dashed border-border bg-secondary/35 px-4 py-4 text-sm text-muted-foreground">
      По этому заказу ручное действие магазина сейчас не требуется.
    </div>
  );
}

function BoardStat({
  title,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  tone: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className={cn("rounded-[26px] p-4", tone)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] opacity-75">{title}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        <div className="rounded-2xl bg-white/20 p-3">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-sm opacity-80">{hint}</p>
    </div>
  );
}

function HeroMeta({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-[22px] bg-white/10 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-white/65">{caption}</p>
    </div>
  );
}

function DetailCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-white/85 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-muted-foreground", emphasized && "font-semibold text-foreground")}>
        {label}
      </span>
      <span className={cn("font-medium", emphasized && "text-base font-semibold")}>{value}</span>
    </div>
  );
}

function TileMeta({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-secondary/55 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold leading-5",
          compact ? "whitespace-nowrap" : "break-words",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function getActionHint(order: OrderResponse) {
  switch (order.status) {
    case "AWAITING_STORE_CONFIRMATION":
      return "Следующий шаг: подтвердить заказ и передать его в сборку.";
    case "ASSEMBLING":
      return "Следующий шаг: завершить сборку и отметить заказ готовым.";
    case "READY_FOR_PICKUP":
      return "????????? ???: ????????? ?????????? ???????.";
    case "COURIER_ASSIGNED":
      return "????????? ???: ??????????? ???????? ?????? ???????.";
    case "ON_THE_WAY":
      return "Заказ в доставке. Контроль нужен только при отклонениях.";
    case "PICKED_UP":
      return "Заказ уже забран курьером.";
    case "DELIVERED":
      return "Заказ успешно доставлен.";
    case "CANCELLED":
      return "Заказ отменён.";
    case "FAILED":
      return "Доставка завершилась с ошибкой.";
  }
}
