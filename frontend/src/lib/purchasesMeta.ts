/** Статус закупки с бэкенда */
export type PurchaseStatus =
  | "collecting"
  | "closed"
  | "completed"
  | "cancelled";

export const STATUS_ORDER: Exclude<PurchaseStatus, "cancelled">[] = [
  "collecting",
  "closed",
  "completed",
];

export const STATUS_LABELS: Record<PurchaseStatus, string> = {
  collecting: "Сбор заявок",
  closed: "Набор закрыт",
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

export type ParticipantPreview = {
  user_id: number;
  user_name: string;
  /** Для Dicebear при пустом avatar_url */
  email?: string;
  avatar_url?: string;
};

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
  my_participant_status?: "processing" | "assembly" | "delivery" | "handed" | string;
  category?: string;
  image_url?: string;
  retail_price?: string | null;
  participant_preview?: ParticipantPreview[];
  rating_avg?: number;
  rating_count?: number;
};

export type CatalogResponse = {
  items: Purchase[];
  total: number;
  limit: number;
  offset: number;
};
