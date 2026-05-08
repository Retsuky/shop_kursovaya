import tokens from "./landing-tokens.module.css";
import styles from "./how-it-works.module.css";

const steps = [
  {
    icon: "groups",
    title: "Вступите в сделку",
    text: "Найдите нужный товар и присоединитесь к коллективной покупке.",
    tone: "primary" as const,
  },
  {
    icon: "track_changes",
    title: "Достигните цели",
    text: "Поделитесь сделкой с друзьями. Как только группа достигнет нужного размера, цена упадет.",
    tone: "tertiary" as const,
  },
  {
    icon: "savings",
    title: "Экономьте больше",
    text: "Мы обработаем заказ и доставим товары. Вы получаете выгоду от коллективной силы.",
    tone: "secondary" as const,
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className={`${tokens.root} ${styles.section}`}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>Как это работает</h2>
        <p className={styles.subtitle}>Три простых шага к общественной экономии</p>
        <div className={styles.grid}>
          {steps.map((step) => (
            <div key={step.title} className={styles.card}>
              <div className={`${styles.iconWrap} ${styles[`icon_${step.tone}`]}`}>
                <span className={`material-symbols-outlined ${styles.icon}`}>{step.icon}</span>
              </div>
              <h3 className={styles.cardTitle}>{step.title}</h3>
              <p className={styles.cardText}>{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
