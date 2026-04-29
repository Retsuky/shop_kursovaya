import Image from "next/image";
import Link from "next/link";
import tokens from "./landing-tokens.module.css";
import styles from "./home-hero.module.css";

const AVATARS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBGbzlczcQvgYmTwoCdciBl1WNR5GNYzlciBwzCDshem-obKid3_gD66D1qYTQRuRCjuBovLnOH3q11y1-2wGMAgik1Lr3F9LSLwrj-YNvfGkrOn_Ps77WbAH6TVNEcUTy7PkkY_82zHxbsgisL-ORafwj_U5R2powJRtuk-jTNzUgKdWyqgHuOGdWOG9qrn2u3WC-V68aC9W0033mx54VqNXHLiJyZNXJeGBW0Qc3cBFQ4YIwXWvkBZHBJvV4wsjiAtuyI13f_93A",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCmFIyEw7L5Fn2S4sXaemP9AButl0t0tSFe1xIdtNCwFoi15uhT2pmsvvrpKUbHRwpF3pT_b4y0y-m9UdLUWpcnhuGSnlbGsTQ98mVDHzUZ7_IiAqqxpp0NQZjC13vSDOJXEn2NhsdW5_RhWU5uR8uVylJQoUZEeECuCNxlmYxeZN5-JGEUeK16bHM-DSuBfZht66CfRC6yqDD77NODCs5LuzhN1f18zKJ8ti3yY_8S2RlinfzP7J_V8JxltF6oq7jVluWU_p0lVzE",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBmZBjvt24LxCZ9f1yUxkzngaS-JXXIiFk5MCvOu3naruqXHT-s2goS_rftEdL-6ok9LZZjDaXWKS2NV6hoeMoMJfgmwNxR1AAcuaxYrPb32mVNpaiGd0GuZ_kfgR1lKhbn8P6fuS7YCxJ3O4kekmxjv47DqaBGDSmPmjRqT4QiGDmcTVawpFlvmaG9Wf8aZ2M-zkI8pk-jmFaq4OhdVxDhwmC8_WtRSvndElCOxRCdraU9xEnPRYRVbSbYUuzUY1bfggS-ypogItM",
];

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
            Объединяйтесь с соседями и сообществом, чтобы покупать любимые товары по оптовым ценам.
            Коллективная покупательная способность с доставкой до двери.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/catalog" className={styles.btnJoin}>
              Вступить в группу
            </Link>
            <Link href="/home#how-it-works" className={styles.btnOutline}>
              Как это работает
            </Link>
          </div>
          <div className={styles.socialProof}>
            <div className={styles.avatarStack}>
              {AVATARS.map((src) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  width={40}
                  height={40}
                  className={styles.stackAvatar}
                  unoptimized
                />
              ))}
            </div>
            <p className={styles.socialText}>
              <span className={styles.socialBold}>12k+</span> человек уже экономят
            </p>
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
