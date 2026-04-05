import type React from "react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, MapPin, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { useMerchantWorkspace } from "@/providers/merchant-workspace-provider";
import { formatRelative } from "@/lib/format";

const branchSchema = z.object({
  name: z.string().min(2, "Укажите название филиала"),
  address: z.string().min(4, "Укажите адрес"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

type BranchValues = z.infer<typeof branchSchema>;

export function BranchesPage() {
  const { session } = useAuth();
  const { workspace, addBranch } = useMerchantWorkspace();
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(null);

  const form = useForm<BranchValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: "",
      address: "",
      latitude: 47.222,
      longitude: 39.718,
    },
  });

  const createBranch = useMutation({
    mutationFn: (values: BranchValues) => api.createBranch(session!.accessToken, values),
    onSuccess: (branch) => {
      addBranch(branch);
      setLastCreatedAt(new Date().toISOString());
      toast.success(`Филиал "${branch.name}" создан`);
      form.reset({
        name: "",
        address: "",
        latitude: branch.latitude,
        longitude: branch.longitude,
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Не удалось создать филиал");
    },
  });

  const onSubmit = form.handleSubmit((values) => createBranch.mutate(values));

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Новый филиал</CardTitle>
          <CardDescription>
            Создайте торговую точку, в которую затем можно принимать приход на склад и
            обрабатывать заказы.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Название" error={form.formState.errors.name?.message}>
            <Input placeholder="Центральный магазин" {...form.register("name")} />
          </FormField>
          <FormField label="Адрес" error={form.formState.errors.address?.message}>
            <Input placeholder="ул. Пушкинская, 10" {...form.register("address")} />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Широта" error={form.formState.errors.latitude?.message}>
              <Input type="number" step="0.0001" {...form.register("latitude")} />
            </FormField>
            <FormField label="Долгота" error={form.formState.errors.longitude?.message}>
              <Input type="number" step="0.0001" {...form.register("longitude")} />
            </FormField>
          </div>
          <Button className="w-full" size="lg" onClick={onSubmit} disabled={createBranch.isPending}>
            {createBranch.isPending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Создаем филиал...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Создать филиал
              </>
            )}
          </Button>
          {lastCreatedAt && (
            <div className="rounded-2xl bg-accent p-4 text-sm text-accent-foreground">
              Последнее создание было {formatRelative(lastCreatedAt)}.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ваши филиалы</CardTitle>
          <CardDescription>
            Этот список сохраняется в кабинете после успешного серверного создания, потому
            что backend пока не предоставляет отдельный `GET /merchant/branches`.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspace.branches.length > 0 ? (
            workspace.branches.map((branch) => (
              <div
                key={branch.id}
                className="rounded-[26px] border border-border/70 bg-white/80 p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-700" />
                      <p className="text-lg font-semibold">{branch.name}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {branch.address}
                    </p>
                  </div>
                  <Badge className="w-fit border-emerald-200 bg-emerald-100 text-emerald-900">
                    {branch.status}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <SmallMeta label="ID" value={`#${branch.id}`} />
                  <SmallMeta label="Широта" value={branch.latitude.toFixed(4)} />
                  <SmallMeta label="Долгота" value={branch.longitude.toFixed(4)} />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[30px] border border-dashed border-border bg-secondary/40 p-8 text-center text-sm leading-6 text-muted-foreground">
              Пока нет филиалов. Создайте первый филиал слева, и он появится в этом списке.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FormField({
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

function SmallMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
