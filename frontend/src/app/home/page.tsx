import CategorySection from "../components/landing/CategorySection";
import HomeHero from "../components/landing/HomeHero";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import MarketingFooter from "../components/landing/MarketingFooter";
import MarketingHeader from "../components/landing/MarketingHeader";
import TrendingDealsSection from "../components/landing/TrendingDealsSection";
import styles from "./home-landing.module.css";

export default function HomePage() {
  return (
    <div className={styles.landing}>
      <MarketingHeader />
      <main className={styles.main}>
        <HomeHero />
        <HowItWorksSection />
        <TrendingDealsSection />
        <CategorySection />
      </main>
      <MarketingFooter />
    </div>
  );
}
