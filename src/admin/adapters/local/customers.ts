import type { AdminCustomer } from "../../types";
import { listOrders } from "./orders";

export function listCustomers(): AdminCustomer[] {
  const orders = listOrders();
  const byKey = new Map<string, AdminCustomer>();

  for (const order of orders) {
    const name = order.address.fullName || "زائر";
    const phone = order.address.phone || "";
    const key = `${name.toLowerCase()}::${phone}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.orderCount += 1;
    } else {
      byKey.set(key, {
        id: `cust-${key}`,
        name,
        email: "",
        phone,
        joinedAt: order.createdAt,
        orderCount: 1,
      });
    }
  }

  return [...byKey.values()];
}
