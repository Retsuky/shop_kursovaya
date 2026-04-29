import { Suspense } from "react";
import CatalogView from "./CatalogView";
import styles from "./catalog.module.css";

function CatalogFallback() {
  return (
    <div className={styles.fallback}>
      <p>Загрузка каталога…</p>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<CatalogFallback />}>
      <CatalogView />
    </Suspense>
  );
}
