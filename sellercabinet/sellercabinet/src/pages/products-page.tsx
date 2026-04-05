import type React from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatMeasure, formatMoney } from "@/lib/format";
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

const productSchema = z.object({
  name: z.string().min(2, "Укажите название позиции"),
  measure: z.enum(["PIECE", "KILOGRAM"]),
  priceMinor: z.coerce.number().positive("Цена должна быть больше нуля"),
});

type ProductValues = z.infer<typeof productSchema>;

export function ProductsPage() {
  const { session } = useAuth();
  const { workspace, addProduct } = useMerchantWorkspace();
  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      measure: "PIECE",
      priceMinor: 9900,
    },
  });

  const createProduct = useMutation({
    mutationFn: (values: ProductValues) => api.createProduct(session!.accessToken, values),
    onSuccess: (product) => {
      addProduct(product);
      toast.success(`Товар "${product.name}" добавлен`);
      form.reset({
        name: "",
        measure: product.measure,
        priceMinor: product.priceMinor,
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Не удалось создать товар");
    },
  });

  const onSubmit = form.handleSubmit((values) => createProduct.mutate(values));

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Новая номенклатура</CardTitle>
          <CardDescription>
            Добавьте товарную позицию в организацию. Далее она станет доступной для приходов
            на склад и заказов пользователей.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Название" error={form.formState.errors.name?.message}>
            <Input placeholder="Молоко 3.2%" {...form.register("name")} />
          </Field>
          <Field label="Единица измерения" error={form.formState.errors.measure?.message}>
            <Select
              value={form.watch("measure")}
              onValueChange={(value) =>
                form.setValue("measure", value as ProductValues["measure"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите единицу измерения" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PIECE">Штуки</SelectItem>
                <SelectItem value="KILOGRAM">Килограммы</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Цена в копейках" error={form.formState.errors.priceMinor?.message}>
            <Input type="number" step="10" {...form.register("priceMinor")} />
          </Field>
          <Button className="w-full" size="lg" onClick={onSubmit} disabled={createProduct.isPending}>
            {createProduct.isPending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Сохраняем позицию...
              </>
            ) : (
              <>
                <PackagePlus className="h-4 w-4" />
                Добавить товар
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Каталог в кабинете</CardTitle>
          <CardDescription>
            Позиции, созданные через merchant API. Список хранится в локальном реестре
            кабинета до тех пор, пока backend не отдаст отдельный `GET /merchant/products`.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspace.products.length > 0 ? (
            workspace.products.map((product) => (
              <div
                key={product.id}
                className="rounded-[26px] border border-border/70 bg-white/85 p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg font-semibold">{product.name}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatMoney(product.priceMinor)} за {formatMeasure(1, product.measure)}
                    </p>
                  </div>
                  <Badge className="w-fit border-emerald-200 bg-emerald-100 text-emerald-900">
                    {product.status}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Meta label="ID" value={`#${product.id}`} />
                  <Meta
                    label="Мера"
                    value={product.measure === "PIECE" ? "Штуки" : "Килограммы"}
                  />
                  <Meta label="Цена" value={formatMoney(product.priceMinor)} />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[30px] border border-dashed border-border bg-secondary/40 p-8 text-center text-sm leading-6 text-muted-foreground">
              В каталоге пока пусто. Добавьте первую товарную позицию через форму слева.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
