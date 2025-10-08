import { lazy, Suspense } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import { Package, Zap, Handshake } from "lucide-react";

// Lazy loading des composants lourds pour optimiser les performances
const Features = lazy(() => import("../components/Features"));
const Pricing = lazy(() => import("../components/Pricing"));
const FAQ = lazy(() => import("../components/FAQ"));
const DevisForm = lazy(() => import("../components/DevisForm"));
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

        {/* Section Actualités - Optimisée et responsive */}
        <section 
          id="news" 
          className="py-12 sm:py-16 lg:py-20 bg-gray-50"
          aria-labelledby="news-title"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 
              id="news-title"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 text-gray-900"
            >
              Actualités
            </h2>

            <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Actu 1 */}
              <article className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center focus-within:ring-2 focus-within:ring-blue-500">
                <div 
                  className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4"
                  aria-hidden="true"
                >
                  <Package size={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">
                  Nouvelle fonctionnalité
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 flex-grow">
                  Découvrez notre nouveau module de gestion des expéditions avec suivi en temps réel.
                </p>
                <a 
                  href="#features" 
                  className="text-blue-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  aria-label="En savoir plus sur la nouvelle fonctionnalité"
                >
                  En savoir plus →
                </a>
              </article>

              {/* Actu 2 */}
              <article className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center focus-within:ring-2 focus-within:ring-yellow-500">
                <div 
                  className="w-16 h-16 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-600 mb-4"
                  aria-hidden="true"
                >
                  <Zap size={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">
                  Mise à jour
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 flex-grow">
                  Nous avons amélioré la performance et la sécurité de l'application pour tous les utilisateurs.
                </p>
                <a 
                  href="#features" 
                  className="text-blue-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  aria-label="Lire la suite de la mise à jour"
                >
                  Lire la suite →
                </a>
              </article>

              {/* Actu 3 */}
              <article className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center focus-within:ring-2 focus-within:ring-green-500 md:col-span-2 lg:col-span-1">
                <div 
                  className="w-16 h-16 flex items-center justify-center rounded-full bg-green-100 text-green-600 mb-4"
                  aria-hidden="true"
                >
                  <Handshake size={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-900">
                  Nouveau partenariat
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 flex-grow">
                  Sloti collabore désormais avec de nouveaux transporteurs pour élargir vos possibilités.
                </p>
                <a 
                  href="#features" 
                  className="text-blue-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  aria-label="Découvrir le nouveau partenariat"
                >
                  Découvrir →
                </a>
              </article>
            </div>
          </div>
        </section>

        {/* Section FAQ */}
        <section id="faq" aria-labelledby="faq-title">
          <Suspense fallback={<LoadingSpinner />}>
            <FAQ />
          </Suspense>
        </section>

        {/* Section Devis */}
        <section id="DevisForm" aria-labelledby="devis-title">
          <Suspense fallback={<LoadingSpinner />}>
            <DevisForm />
          </Suspense>
        </section>
      </main>
      
      <Suspense fallback={<LoadingSpinner />}>
        <Footer />
      </Suspense>
    </>
  );
}