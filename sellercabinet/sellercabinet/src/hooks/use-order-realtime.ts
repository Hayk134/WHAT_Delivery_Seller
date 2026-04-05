import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getWsBaseUrl } from "@/lib/env";
import { getOrderStatusLabel } from "@/lib/format";
import type { OrderRealtimeEvent, OrderResponse } from "@/types/api";

const terminalStatuses = new Set(["DELIVERED", "CANCELLED", "FAILED"]);

export function useOrderRealtime(
  orders: OrderResponse[] | undefined,
  token: string | null,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const [locations, setLocations] = useState<Record<number, { lat: number; lng: number }>>(
    {},
  );

  const activeIds = useMemo(
    () =>
      (orders ?? [])
        .filter((order) => !terminalStatuses.has(order.status))
        .map((order) => order.id)
        .sort((a, b) => a - b),
    [orders],
  );

  useEffect(() => {
    if (!enabled || !token || activeIds.length === 0) {
      return;
    }

    const sockets = new Map<number, WebSocket>();
    const timers = new Map<number, number>();

    const connect = (orderId: number) => {
      const ws = new WebSocket(
        `${getWsBaseUrl()}/ws/orders/${orderId}?access_token=${encodeURIComponent(token)}`,
      );

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as OrderRealtimeEvent;

          if (
            payload.type === "COURIER_LOCATION" &&
            payload.courierLatitude != null &&
            payload.courierLongitude != null
          ) {
            const nextLocation = {
              lat: payload.courierLatitude,
              lng: payload.courierLongitude,
            };

            setLocations((current) => ({
              ...current,
              [payload.orderId]: nextLocation,
            }));
          }

          if (payload.type === "ORDER_STATUS_CHANGED" && payload.status) {
            toast.info(`Заказ #${payload.orderId}: ${getOrderStatusLabel(payload.status)}`);
            void queryClient.invalidateQueries({
              queryKey: ["merchant", "orders", "board"],
            });
          }
        } catch {
          // Ignore malformed realtime payloads.
        }
      };

      ws.onclose = () => {
        if (timers.has(orderId)) {
          window.clearTimeout(timers.get(orderId));
        }

        const timer = window.setTimeout(() => connect(orderId), 3500);
        timers.set(orderId, timer);
      };

      sockets.set(orderId, ws);
    };

    activeIds.forEach(connect);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      sockets.forEach((socket) => socket.close());
    };
  }, [activeIds, enabled, queryClient, token]);

  return locations;
}
