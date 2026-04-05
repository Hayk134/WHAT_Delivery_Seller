import type React from "react";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  ArchiveRestore,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  LoaderCircle,
  PackageCheck,
  RadioTower,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getWsBaseUrl } from "@/lib/env";
import { formatDateTime, formatMeasure, formatRelative } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { useMerchantWorkspace } from "@/providers/merchant-workspace-provider";
import type { InventoryMovementResponse, InventoryRealtimeEvent } from "@/types/api";

const stockSchema = z.object({
  branchId: z.string().min(1, "Выберите филиал"),
  productId: z.string().min(1, "Выберите товар"),
  quantity: z.coerce.number().positive("Количество должно быть больше нуля"),
});

type StockValues = z.infer<typeof stockSchema>;

export function StockPage() {
  const { session } = useAuth();
  const { workspace, addReceipt } = useMerchantWorkspace();
  const queryClient = useQueryClient();

  const form = useForm<StockValues>({
    resolver: zodResolver(stockSchema),
    defaultValues: {
      branchId: workspace.branches[0] ? String(workspace.branches[0].id) : "",
      productId: workspace.products[0] ? String(workspace.products[0].id) : "",
      quantity: 10,
    },
  });

  useEffect(() => {
    const currentBranch = form.getValues("branchId");
    const currentProduct = form.getValues("productId");

    if (!currentBranch && workspace.branches[0]) {
      form.setValue("branchId", String(workspace.branches[0].id));
    }

    if (!currentProduct && workspace.products[0]) {
      form.setValue("productId", String(workspace.products[0].id));
    }
  }, [form, workspace.branches, workspace.products]);

  const selectedBranchId = Number(form.watch("branchId")) || null;
  const selectedProduct = useMemo(
    () =>
      workspace.products.find((item) => String(item.id) === String(form.watch("productId"))),
    [form, workspace.products],
  );

  const canCreate = workspace.branches.length > 0 && workspace.products.length > 0;

  const receiptsQuery = useQuery({
    queryKey: ["merchant", "stock", "receipts"],
    queryFn: () => api.getStockReceipts(session!.accessToken),
  });

  const stocksQuery = useQuery({
    queryKey: ["merchant", "stock", "balances", selectedBranchId],
    queryFn: () => api.getBranchStocks(session!.accessToken, selectedBranchId!),
    enabled: Boolean(selectedBranchId),
  });

  const movementsQuery = useQuery({
    queryKey: ["merchant", "stock", "movements", selectedBranchId],
    queryFn: () => api.getInventoryMovements(session!.accessToken, selectedBranchId!, 50),
    enabled: Boolean(selectedBranchId),
  });

  useBranchInventoryRealtime(selectedBranchId, session?.accessToken ?? null);

  const createReceipt = useMutation({
    mutationFn: (values: StockValues) =>
      api.createStockReceipt(session!.accessToken, {
        branchId: Number(values.branchId),
        items: [{ productId: Number(values.productId), quantity: values.quantity }],
      }),
    onSuccess: (receipt) => {
      addReceipt({
        receiptId: receipt.id,
        branchId: receipt.branchId,
        items: receipt.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        createdAt: receipt.createdAt,
      });
      void queryClient.invalidateQueries({ queryKey: ["merchant", "stock"] });
      toast.success(`Приход #${receipt.id} зарегистрирован`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Не удалось зарегистрировать приход",
      );
    },
  });

  const selectedBranchStocks = stocksQuery.data ?? [];
  const balanceSummary = useMemo(() => {
    return selectedBranchStocks.reduce(
      (acc, stock) => {
        acc.available += stock.availableQuantity;
        acc.reserved += stock.reservedQuantity;
        acc.onHand += stock.onHandQuantity;
        return acc;
      },
      { available: 0, reserved: 0, onHand: 0 },
    );
  }, [selectedBranchStocks]);

  const onSubmit = form.handleSubmit((values) => createReceipt.mutate(values));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <CardTitle>Регистрация прихода</CardTitle>
            <CardDescription>
              Создайте приход на склад филиала и сразу обновите доступные остатки.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canCreate ? (
              <div className="rounded-3xl border border-dashed border-border bg-secondary/40 p-6 text-sm leading-6 text-muted-foreground">
                Для прихода нужны хотя бы один филиал и один товар. Сначала заведите их в
                соответствующих разделах.
              </div>
            ) : (
              <>
                <Field label="Филиал" error={form.formState.errors.branchId?.message}>
                  <Select
                    value={form.watch("branchId")}
                    onValueChange={(value) =>
                      form.setValue("branchId", value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите филиал" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspace.branches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Товар" error={form.formState.errors.productId?.message}>
                  <Select
                    value={form.watch("productId")}
                    onValueChange={(value) =>
                      form.setValue("productId", value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите товар" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspace.products.map((product) => (
                        <SelectItem key={product.id} value={String(product.id)}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Количество" error={form.formState.errors.quantity?.message}>
                  <Input type="number" step="0.1" {...form.register("quantity")} />
                </Field>
                {selectedProduct && (
                  <div className="rounded-3xl bg-accent p-4 text-sm text-accent-foreground">
                    Будет зафиксирован приход товара "{selectedProduct.name}" в объеме{" "}
                    {formatMeasure(form.watch("quantity"), selectedProduct.measure)}.
                  </div>
                )}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={onSubmit}
                  disabled={createReceipt.isPending}
                >
                  {createReceipt.isPending ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Регистрируем приход...
                    </>
                  ) : (
                    <>
                      <ArchiveRestore className="h-4 w-4" />
                      Создать приход
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Состояние склада по филиалу</CardTitle>
                <CardDescription>
                  Доступные остатки, резерв и фактический on-hand по выбранной точке.
                </CardDescription>
              </div>
              {selectedBranchId ? (
                <Badge className="w-fit border-amber-200 bg-amber-100 text-amber-900">
                  <RadioTower className="mr-1 h-3.5 w-3.5" />
                  Realtime inventory
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryStat
                title="Доступно"
                value={balanceSummary.available}
                tone="bg-lime-100 text-lime-900"
              />
              <SummaryStat
                title="В резерве"
                value={balanceSummary.reserved}
                tone="bg-amber-100 text-amber-900"
              />
              <SummaryStat
                title="On hand"
                value={balanceSummary.onHand}
                tone="bg-sky-100 text-sky-900"
              />
            </div>

            {stocksQuery.isLoading ? (
              <LoadingHint text="Загружаем остатки филиала..." />
            ) : selectedBranchId && selectedBranchStocks.length > 0 ? (
              <div className="space-y-3">
                {selectedBranchStocks.map((stock) => (
                  <div
                    key={`${stock.branchId}-${stock.productId}`}
                    className="rounded-[24px] border border-border/70 bg-white/85 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">{stock.productName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {stock.measure === "PIECE" ? "Штуки" : "Килограммы"}
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <StockPill
                          label="Доступно"
                          value={formatMeasure(stock.availableQuantity, stock.measure)}
                        />
                        <StockPill
                          label="Резерв"
                          value={formatMeasure(stock.reservedQuantity, stock.measure)}
                        />
                        <StockPill
                          label="On hand"
                          value={formatMeasure(stock.onHandQuantity, stock.measure)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel text="Выберите филиал и начните работу со складом. Как только появятся движения, здесь отобразятся остатки." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card>
          <CardHeader>
            <CardTitle>Журнал движений</CardTitle>
            <CardDescription>
              История приходов, резервов, release и write-off по выбранному филиалу.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {movementsQuery.isLoading ? (
              <LoadingHint text="Загружаем журнал движений..." />
            ) : (movementsQuery.data?.length ?? 0) > 0 ? (
              movementsQuery.data!.map((movement) => (
                <MovementRow key={movement.id} movement={movement} />
              ))
            ) : (
              <EmptyPanel text="Для этого филиала пока нет движений склада." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>История приходов</CardTitle>
            <CardDescription>
              Серверный список stock receipts по организации из merchant API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {receiptsQuery.isLoading ? (
              <LoadingHint text="Загружаем историю приходов..." />
            ) : (receiptsQuery.data?.length ?? 0) > 0 ? (
              receiptsQuery.data!.map((receipt) => (
                <div
                  key={receipt.id}
                  className="rounded-[24px] border border-border/70 bg-white/85 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold">Приход #{receipt.id}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{receipt.branchName}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(receipt.createdAt)}
                    </p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {receipt.items.map((item) => (
                      <div
                        key={`${receipt.id}-${item.productId}`}
                        className="rounded-2xl bg-secondary/55 px-4 py-3"
                      >
                        <p className="text-sm font-semibold">{item.productName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatMeasure(item.quantity, item.measure)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <EmptyPanel text="Пока нет приходов, сохраненных на backend." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function useBranchInventoryRealtime(branchId: number | null, token: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!branchId || !token) {
      return;
    }

    const socket = new WebSocket(
      `${getWsBaseUrl()}/ws/merchant/branches/${branchId}/inventory?access_token=${encodeURIComponent(token)}`,
    );

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as InventoryRealtimeEvent;
        void queryClient.invalidateQueries({
          queryKey: ["merchant", "stock", "balances", branchId],
        });
        void queryClient.invalidateQueries({
          queryKey: ["merchant", "stock", "movements", branchId],
        });
        void queryClient.invalidateQueries({
          queryKey: ["merchant", "stock", "receipts"],
        });
        toast.info(`Склад филиала обновлен: ${payload.stock.productName}`);
      } catch {
        // Ignore malformed realtime events.
      }
    };

    return () => {
      socket.close();
    };
  }, [branchId, queryClient, token]);
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function SummaryStat({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl px-4 py-4 ${tone}`}>
      <p className="text-xs uppercase tracking-[0.18em] opacity-70">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value.toLocaleString("ru-RU")}</p>
    </div>
  );
}

function StockPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function MovementRow({ movement }: { movement: InventoryMovementResponse }) {
  const meta = getMovementMeta(movement.movementType);

  return (
    <div className="rounded-[24px] border border-border/70 bg-white/85 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl p-3 ${meta.tone}`}>
            <meta.icon className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">{movement.productName}</p>
            <p className="mt-1 text-sm text-muted-foreground">{meta.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateTime(movement.createdAt)}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <DeltaPill
            label="Доступно"
            value={signedNumber(movement.deltaAvailableQuantity)}
          />
          <DeltaPill
            label="Резерв"
            value={signedNumber(movement.deltaReservedQuantity)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <StockPill
          label="После: available"
          value={formatMeasure(movement.availableAfterQuantity, movement.measure)}
        />
        <StockPill
          label="После: reserve"
          value={formatMeasure(movement.reservedAfterQuantity, movement.measure)}
        />
        <StockPill
          label="После: on hand"
          value={formatMeasure(movement.onHandAfterQuantity, movement.measure)}
        />
      </div>

      {(movement.note || movement.orderId || movement.receiptId) && (
        <div className="mt-4 rounded-2xl bg-secondary/55 px-4 py-3 text-sm text-muted-foreground">
          {movement.note ? <p>{movement.note}</p> : null}
          {movement.orderId ? <p>Заказ: #{movement.orderId}</p> : null}
          {movement.receiptId ? <p>Приход: #{movement.receiptId}</p> : null}
        </div>
      )}
    </div>
  );
}

function DeltaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function LoadingHint({ text }: { text: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-[28px] border border-dashed border-border bg-secondary/35 text-sm text-muted-foreground">
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-border bg-secondary/35 p-8 text-center text-sm leading-6 text-muted-foreground">
      {text}
    </div>
  );
}

function signedNumber(value: number) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString("ru-RU")}`;
}

function getMovementMeta(type: InventoryMovementResponse["movementType"]) {
  switch (type) {
    case "RECEIPT":
      return {
        label: "Приход на склад",
        icon: ArrowDownToLine,
        tone: "bg-emerald-100 text-emerald-900",
      };
    case "RESERVATION_CREATED":
      return {
        label: "Создан резерв под заказ",
        icon: PackageCheck,
        tone: "bg-amber-100 text-amber-900",
      };
    case "RESERVATION_RELEASED":
      return {
        label: "Резерв возвращен в доступный остаток",
        icon: ArrowUpFromLine,
        tone: "bg-sky-100 text-sky-900",
      };
    case "WRITE_OFF":
      return {
        label: "Резерв списан окончательно",
        icon: Boxes,
        tone: "bg-rose-100 text-rose-900",
      };
    case "MANUAL_ADJUSTMENT":
      return {
        label: "Ручная корректировка",
        icon: Activity,
        tone: "bg-stone-200 text-stone-900",
      };
  }
}
