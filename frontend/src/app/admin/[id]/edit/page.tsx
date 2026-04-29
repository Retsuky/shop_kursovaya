"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import AdminProductForm from "../../AdminProductForm";
import styles from "../../admin.module.css";

export default function AdminEditProductPage() {
  const params = useParams();
  const raw = params?.id;
  const id = typeof raw === "string" ? Number(raw) : Array.isArray(raw) ? Number(raw[0]) : NaN;

  if (!Number.isInteger(id) || id < 1) {
    return (
      <div className={styles.page}>
        <p className={styles.alert}>Некорректная ссылка на товар.</p>
        <Link href="/admin" className={styles.btnGhost}>
          В админ-панель
        </Link>
      </div>
    );
  }

  return <AdminProductForm mode="edit" purchaseId={id} />;
}
