import type { Order, OrderStatus } from "@/types/cart";

export const ORDERS_STORAGE_KEY = "luminous-orders";

export function listOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Order[];
    }
  } catch {}
  return [];
}

export function saveOrders(list: Order[]) {
  try {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  saveOrders(
    listOrders().map((order) =>
      order.id === id ? { ...order, status } : order,
    ),
  );
}
