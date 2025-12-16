import { lazy, Suspense } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import BetaBenefits from "../components/BetaBenefits";
import CTABooking from "../components/CTABooking"; // 👈 Même dossier que les autres composants vitrine

// Lazy loading des composants lourds pour optimiser les performances
const Features = lazy(() => import("../components/Features"));
const Pricing = lazy(() => import("../components/Pricing"));
const Footer = lazy(() => import("../components/Footer"));

// Composant de chargement
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12" role="status" aria-label="Chargement">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Hero />

        {/* Section BetaBenefits - Avantages de la bêta privée */}
        <section id="beta-benefits" aria-labelledby="beta-benefits-title">
          <BetaBenefits />
        </section>

        {/* Section Features avec lazy loading */}
        <section id="features" aria-labelledby="features-title">
          <Suspense fallback={<LoadingSpinner />}>
            <Features />
          </Suspense>
        </section>

        {/* Section Pricing */}
        <section id="pricing" aria-labelledby="pricing-title">
          <Suspense fallback={<LoadingSpinner />}>
            <Pricing />
          </Suspense>
        </section>

        {/* Section CTA avec prise de RDV intégrée */}
        <section id="demo" aria-labelledby="demo-title">
          <CTABooking />
        </section>
      </main>
      
      <Suspense fallback={<LoadingSpinner />}>
        <Footer />
      </Suspense>
    </>
  );
}