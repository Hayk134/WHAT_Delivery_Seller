import { format, formatDistanceToNowStrict, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale";
import type { OrderStatus } from "@/types/api";

export function formatMoney(minor: number, currency = "RUB") {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function formatDateTime(value: string) {
  const date = new Date(value);

  if (isToday(date)) {
    return `Сегодня, ${format(date, "HH:mm", { locale: ru })}`;
  }

  if (isYesterday(date)) {
    return `Вчера, ${format(date, "HH:mm", { locale: ru })}`;
  }

  return format(date, "d MMMM, HH:mm", { locale: ru });
}

export function formatRelative(value: string) {
  return formatDistanceToNowStrict(new Date(value), {
    addSuffix: true,
    locale: ru,
  });
}

export function formatMeasure(quantity: number, measure: "PIECE" | "KILOGRAM") {
  if (measure === "KILOGRAM") {
    return `${quantity.toLocaleString("ru-RU", {
      minimumFractionDigits: quantity % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 2,
    })} кг`;
  }

  return `${quantity.toLocaleString("ru-RU")} шт`;
}

export const orderStatusMeta: Record<
  OrderStatus,
  { label: string; tone: string; shortLabel: string }
> = {
  AWAITING_STORE_CONFIRMATION: {
    label: "Ждет подтверждения магазина",
    shortLabel: "Новый",
    tone: "bg-amber-100 text-amber-900 border-amber-200",
  },
  ASSEMBLING: {
    label: "Собирается",
    shortLabel: "Сборка",
    tone: "bg-orange-100 text-orange-900 border-orange-200",
  },
  READY_FOR_PICKUP: {
    label: "Готов к выдаче",
    shortLabel: "Готов",
    tone: "bg-lime-100 text-lime-900 border-lime-200",
  },
  COURIER_ASSIGNED: {
    label: "Курьер назначен",
    shortLabel: "Курьер",
    tone: "bg-sky-100 text-sky-900 border-sky-200",
  },
  PICKED_UP: {
    label: "Забран курьером",
    shortLabel: "Забран",
    tone: "bg-cyan-100 text-cyan-900 border-cyan-200",
  },
  ON_THE_WAY: {
    label: "В пути",
    shortLabel: "В пути",
    tone: "bg-indigo-100 text-indigo-900 border-indigo-200",
  },
  DELIVERED: {
    label: "Доставлен",
    shortLabel: "Доставлен",
    tone: "bg-emerald-100 text-emerald-900 border-emerald-200",
  },
  CANCELLED: {
    label: "Отменен",
    shortLabel: "Отменен",
    tone: "bg-rose-100 text-rose-900 border-rose-200",
  },
  FAILED: {
    label: "Ошибка доставки",
    shortLabel: "Ошибка",
    tone: "bg-red-100 text-red-900 border-red-200",
  },
};

export function getOrderStatusLabel(status: OrderStatus) {
  return orderStatusMeta[status].label;
}
