import Image from "next/image";
import Link from "next/link";
import tokens from "./landing-tokens.module.css";
import styles from "./home-hero.module.css";

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBZ5rHBwfBrzew0v1g494YCLn0flSfL9rEJBhVyRc6JXvJ1qEEnLwEmCcQC_fg_PtjaiuHq0S3biEv2sVgXnQHyKaq2MvfcK2DCxbocWEeC6_N1RBW-t4w600nBlpApuwJh1jfSL6gIB4qGd6SPrDphfU6opOwXo034b831EU5vGXgSgIshHckRmJQ-3ArFdEEAu-Da3B27UxJDoqb6qoGB_qfI8NVCj03XFyGKpRKu33uf69JWZGd-pTmZxz8VLAenCQAareUMkQY";

export default function HomeHero() {
  return (
    <section className={`${tokens.root} ${styles.section}`}>
      <div className={styles.grid}>
        <div>
          <h1 className={styles.title}>
            Покупайте вместе,
            <br />
            <span className={styles.titleAccent}>экономьте больше</span>
          </h1>
          <p className={styles.lead}>
            Объединяйтесь, чтобы покупать любимые товары по оптовым ценам.
            Коллективные покупки с доставкой до двери.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/catalog" className={styles.btnJoin}>
              Вступить в группу
            </Link>
            <Link href="/home#how-it-works" className={styles.btnOutline}>
              Как это работает
            </Link>
          </div>
        </div>

        <div className={styles.visual}>
          <div className={styles.visualGlow} aria-hidden />
          <Image
            src={HERO_IMG}
            alt="Люди делают покупки вместе"
            width={640}
            height={480}
            className={styles.heroImage}
            priority
            unoptimized
          />
        </div>
      </div>
    </section>
  );
}
