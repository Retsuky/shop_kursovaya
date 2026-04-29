/** Статус закупки с бэкенда */
export type PurchaseStatus =
  | "collecting"
  | "payment"
  | "supplier_order"
  | "delivery"
  | "completed"
  | "cancelled";

export const STATUS_ORDER: Exclude<PurchaseStatus, "cancelled">[] = [
  "collecting",
  "payment",
  "supplier_order",
  "delivery",
  "completed",
];

export const STATUS_LABELS: Record<PurchaseStatus, string> = {
  collecting: "Сбор заявок",
  payment: "Оплата",
  supplier_order: "Заказ у поставщика",
  delivery: "Доставка и выдача",
  completed: "Завершена",
  cancelled: "Отменена",
};

export function getNextStatus(current: string): PurchaseStatus | null {
  const i = STATUS_ORDER.indexOf(current as (typeof STATUS_ORDER)[number]);

  if (i === -1 || i >= STATUS_ORDER.length - 1) {
    return null;
  }

  return STATUS_ORDER[i + 1];
}

export type Purchase = {
  id: number;
  organizer_id: number;
  title: string;
  description: string;
  product_name: string;
  unit_price: string;
  min_participants: number;
  deadline: string;
  city: string;
  pickup_address: string;
  status: PurchaseStatus | string;
  created_at: string;
  updated_at: string;
  organizer_name?: string;
  participant_count?: number;
  total_quantity?: number;
  my_quantity?: number;
  category?: string;
  image_url?: string;
  retail_price?: string | null;
};

export type CatalogResponse = {
  items: Purchase[];
  total: number;
  limit: number;
  offset: number;
};
