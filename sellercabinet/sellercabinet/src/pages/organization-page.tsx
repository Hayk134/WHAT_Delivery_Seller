import type React from "react";
import { Building2, Globe2, ShieldCheck, User2 } from "lucide-react";
import { env } from "@/lib/env";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/auth-provider";
import { useMerchantWorkspace } from "@/providers/merchant-workspace-provider";

export function OrganizationPage() {
  const { profile, session } = useAuth();
  const { workspace } = useMerchantWorkspace();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <CardTitle>Профиль аккаунта</CardTitle>
          <CardDescription>
            Базовые данные авторизованного merchant-администратора и привязка к организации.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfileRow icon={User2} label="Имя" value={profile?.fullName ?? "—"} />
          <ProfileRow icon={ShieldCheck} label="Роль" value={profile?.role ?? "—"} />
          <ProfileRow icon={Globe2} label="Email" value={profile?.email ?? "—"} />
          <ProfileRow
            icon={Building2}
            label="Organization ID"
            value={session?.organizationId ? `#${session.organizationId}` : "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Технический контур</CardTitle>
          <CardDescription>
            Сводка по API-конфигурации и по тем сущностям, которые уже заведены в кабинете.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoCard
            title="API Base URL"
            value={env.apiBaseUrl}
            hint="Используется для всех merchant-операций приложения"
          />
          <InfoCard
            title="Состояние каталога"
            value={`${workspace.products.length} товаров`}
            hint="Локальный реестр кабинета для текущей организации"
          />
          <InfoCard
            title="Инфраструктура филиалов"
            value={`${workspace.branches.length} филиалов`}
            hint="Сохраняются после успешного POST-запроса к backend"
          />
          <div className="rounded-3xl border border-border bg-secondary/60 p-5">
            <div className="flex items-center gap-3">
              <Badge className="border-amber-200 bg-amber-100 text-amber-900">Важно</Badge>
              <p className="font-semibold">Текущее допущение по продукту</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Кабинет полностью выполняет create/mutate-сценарии на backend. Но повторное
              чтение списков филиалов и товаров после холодного старта сейчас компенсируется
              локальным persistence-слоем, потому что публичный merchant swagger пока не
              содержит соответствующих `GET`-эндпоинтов.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white/80 px-4 py-4">
      <div className="rounded-2xl bg-accent p-3">
        <Icon className="h-5 w-5 text-amber-800" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-base font-semibold">{value}</p>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl bg-white/80 px-5 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
