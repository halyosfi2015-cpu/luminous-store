export type CartItemKind = "product" | "bundle" | "routine";

export type BundleLineItem = {
  productId: string;
  nameAr: string;
  nameEn?: string;
  price: number;
  quantity: number;
  image?: string;
};

export type BundleCartPayload = {
  bundleId: string;
  bundleName: string;
  discountPercent: number;
  originalSubtotal: number;
  discount: number;
  deliveryFee?: number;
  deliveryLabel?: string;
  giftMessage?: string;
  addons?: { id: string; labelAr: string; price: number }[];
  items: BundleLineItem[];
  /** Routine steps (product → time) when kind === "routine". */
  steps?: { productId: string; time: string }[];
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  nameAr: string;
  price: number;
  image: string;
  quantity: number;
  inStock: boolean;
  kind?: CartItemKind;
  bundle?: BundleCartPayload;
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

export type OrderStatus =
  | "pending"
  | "awaiting_review"
  | "contacted"
  | "confirmed"
  | "awaiting_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type Order = {
  id: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  address: ShippingAddress;
  status: OrderStatus;
  createdAt: string;
  /** Optional source/section label (e.g. "باقة مخصصة", "هدية", "روتين", "عرض"). */
  source?: string;
};
