import Header from "@/components/Header";
import PremiumHero from "@/components/PremiumHero";
import SocialImpact from "@/components/SocialImpactV2";
import HowItWorks from "@/components/HowItWorksV2";
import DemoSection from "@/components/DemoSectionV2";
import UseCases from "@/components/UseCasesV2";
import Pricing from "@/components/PricingV2";
import FAQ from "@/components/FAQV2";
import Footer from "@/components/FooterV2";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import KineticGrid from "@/components/KineticGrid";

export default function Home() {
  return (
    <SmoothScroll>
      <ScrollProgress />
      <KineticGrid />
      <Header />
      <main>
        <PremiumHero />
        <SocialImpact />
        <HowItWorks />
        <DemoSection />
        <UseCases />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
