export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  nameAr: string;
  price: number;
  image: string;
  quantity: number;
  inStock: boolean;
};

export type Cart = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
};

export type ShippingAddress = {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  building: string;
  notes?: string;
};

export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  address: ShippingAddress;
  status: OrderStatus;
  createdAt: string;
};
