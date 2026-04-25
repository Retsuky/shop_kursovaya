import Header from "../components/header/Header";
import styles from "../page.module.css";
import homeStyles from "./home.module.css";

const benefits = [
  {
    title: "Экономия на опте",
    text: "Чем больше участников, тем выгоднее цена товара и доставки.",
  },
  {
    title: "Прозрачные статусы",
    text: "Каждый видит этапы: сбор, оплата, заказ у поставщика и выдача.",
  },
  {
    title: "Без лишних чатов",
    text: "Все заявки, суммы и сроки собраны в одном интерфейсе.",
  },
];

const steps = [
  { id: "01", title: "Создайте закупку", text: "Добавьте товар, цену и срок сбора участников." },
  { id: "02", title: "Соберите заявки", text: "Участники указывают количество и подтверждают оплату." },
  { id: "03", title: "Получите и раздайте", text: "Отслеживайте доставку и отмечайте выдачу заказов." },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Header />
        <section className={styles.content}>
          <section className={homeStyles.hero}>
            <p className={homeStyles.badge}>Совместные покупки без переплат</p>
            <h1 className={homeStyles.title}>Объединяйтесь в закупки и экономьте вместе</h1>
            <p className={homeStyles.description}>
              Создавайте группы, собирайте заказы и распределяйте доставку в одном месте.
              Прозрачные статусы, понятные сроки и удобная оплата для каждого участника.
            </p>
            <div className={homeStyles.actions}>
              <button type="button" className={homeStyles.primary}>
                Создать закупку
              </button>
              <button type="button" className={homeStyles.secondary}>
                Найти закупку
              </button>
            </div>
          </section>

          <section className={homeStyles.benefitsSection}>
            <h2 className={homeStyles.heading}>Почему это удобно</h2>
            <div className={homeStyles.grid}>
              {benefits.map((item) => (
                <article key={item.title} className={homeStyles.card}>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={homeStyles.stepsSection}>
            <h2 className={homeStyles.heading}>Как это работает</h2>
            <ol className={homeStyles.list}>
              {steps.map((step) => (
                <li key={step.id} className={homeStyles.item}>
                  <span className={homeStyles.id}>{step.id}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className={homeStyles.cta}>
            <div>
              <h2>Готовы к первой совместной закупке?</h2>
              <p>Подключайте участников и запускайте сбор заказов за пару минут.</p>
            </div>
            <button type="button">Начать бесплатно</button>
          </section>
        </section>
      </main>
    </div>
  );
}
