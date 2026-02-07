import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import HowItWorksSection from "./components/HowItWorksSection";
import DocumentTypesSection from "./components/DocumentTypesSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f0f23] to-[#1a1a2e]">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <DocumentTypesSection />
    </main>
  );
}