import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SignalCategories from "@/components/SignalCategories";
import FeaturedEssays from "@/components/FeaturedEssays";
import Reports from "@/components/Reports";
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
        <FeaturedEssays />
        <Reports />
        <Newsletter />
        <QuoteSection />
      </main>
      <Footer />
    </>
  );
}
