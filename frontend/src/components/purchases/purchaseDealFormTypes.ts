import type { PurchaseStatus } from "../../lib/purchasesMeta";

export const CATALOG_CATEGORIES = [
  "Электроника",
  "Дом и уют",
  "Одежда и обувь",
  "Мода",
  "Фитнес",
  "Аксессуары",
  "Дом и кухня",
];

export type PurchaseDealFormValues = {
  organizer_id: string;
  title: string;
  description: string;
  product_name: string;
  unit_price: string;
  min_participants: string;
  deadline: string;
  city: string;
  pickup_address: string;
  category: string;
  image_url: string;
  retail_price: string;
  status: PurchaseStatus;
};

export function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function defaultDeadlineLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setMinutes(0, 0, 0);
  return toDatetimeLocal(d);
}

export function emptyDealForm(organizerId = ""): PurchaseDealFormValues {
  return {
    organizer_id: organizerId,
    title: "",
    description: "",
    product_name: "",
    unit_price: "100",
    min_participants: "5",
    deadline: defaultDeadlineLocal(),
    city: "",
    pickup_address: "",
    category: "",
    image_url: "",
    retail_price: "",
    status: "collecting",
  };
}

export function dealFormToApiBody(form: PurchaseDealFormValues) {
  return {
    organizer_id: Number(form.organizer_id),
    title: form.title.trim(),
    description: form.description.trim(),
    product_name: form.product_name.trim(),
    unit_price: Number(String(form.unit_price).replace(",", ".")),
    min_participants: Number(form.min_participants),
    deadline: new Date(form.deadline).toISOString(),
    city: form.city.trim(),
    pickup_address: form.pickup_address.trim(),
    category: form.category.trim(),
    image_url: form.image_url.trim(),
    retail_price:
      form.retail_price.trim() === "" ? null : Number(String(form.retail_price).replace(",", ".")),
    status: form.status,
  };
}
