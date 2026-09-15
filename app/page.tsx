import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SignalCategories from "@/components/SignalCategories";
import FeaturedSignals from "@/components/FeaturedSignals";
import DeepDivesSection from "@/components/DeepDivesSection";
import Newsletter from "@/components/Newsletter";
import QuoteSection from "@/components/QuoteSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <SignalCategories />
        <FeaturedSignals />
        <DeepDivesSection />
        <Newsletter />
        <QuoteSection />
      </main>
      <Footer />
    </>
  );
}
