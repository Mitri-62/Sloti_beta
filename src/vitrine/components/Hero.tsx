// src/vitrine/components/Hero.tsx - VERSION SANS IMAGE
import { useState, useEffect } from "react";
import bgHero from "../../assets/bg-hero.png";
import { Calendar, Package, Truck, BarChart3 } from "lucide-react";

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {/* Hero Principal - Full Width centré */}
      <section
        className="relative text-white pt-32 sm:pt-40 lg:pt-48 pb-20 sm:pb-28 lg:pb-32 bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: `url(${bgHero})` }}
        aria-label="Section héro"
      >
        {/* Overlay pour améliorer la lisibilité */}
        <div className="absolute inset-0 bg-black/20" aria-hidden="true"></div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 text-center">
          
          {/* Badge "Nouveau" */}
          <div 
            className={`inline-flex items-center gap-2 bg-green-500/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-green-400/30 transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-sm font-semibold text-green-100">
              🚀 Optimisation 3D en temps réel
            </span>
          </div>

          {/* Titre principal */}
          <h1 
            className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 sm:mb-8 drop-shadow-lg transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            Gérez votre entrepôt{" "}
            <span className="text-[#8BC34A]">3x plus vite</span>
            <br />
            avec l'optimisation 3D
          </h1>

          {/* Sous-titre */}
          <p 
            className={`text-lg sm:text-xl lg:text-2xl text-gray-100 mb-8 sm:mb-10 max-w-3xl mx-auto drop-shadow transition-all duration-1000 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            Sloti automatise vos flux de A à Z : planning collaboratif, 
            chargement optimisé en 3D, tournées intelligentes et stocks en temps réel.
          </p>

          {/* Fonctionnalités rapides */}
          <div 
            className={`flex flex-wrap justify-center gap-3 mb-8 sm:mb-10 transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
              <Calendar size={20} className="text-blue-300" />
              <span className="text-sm font-medium">Planning auto</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
              <Package size={20} className="text-purple-300" />
              <span className="text-sm font-medium">Chargement 3D</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
              <Truck size={20} className="text-orange-300" />
              <span className="text-sm font-medium">Tournées optimisées</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
              <BarChart3 size={20} className="text-green-300" />
              <span className="text-sm font-medium">Stocks temps réel</span>
            </div>
          </div>

          {/* Boutons CTA */}
          <div 
            className={`flex flex-col sm:flex-row justify-center gap-4 mb-10 sm:mb-12 transition-all duration-1000 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <button
              onClick={() => scrollToSection('pricing')}
              className="px-8 py-4 rounded-lg bg-[#8BC34A] hover:bg-green-600 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
              aria-label="Voir la démo interactive"
            >
              Voir la démo interactive
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="px-8 py-4 rounded-lg border-2 bg-black/30 backdrop-blur-sm border-white hover:bg-white hover:text-gray-900 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50"
              aria-label="En savoir plus sur les fonctionnalités"
            >
              En savoir plus
            </button>
          </div>

          {/* Badges de confiance */}
          <div 
            className={`flex flex-wrap justify-center gap-6 text-sm transition-all duration-1000 delay-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-green-400 font-bold">✓</span>
              <span className="font-medium">Essai gratuit 14 jours</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-green-400 font-bold">✓</span>
              <span className="font-medium">Sans engagement</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-green-400 font-bold">✓</span>
              <span className="font-medium">Configuration 10 min</span>
            </div>
          </div>
        </div>

        {/* Indicateur de scroll */}
        <div 
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce cursor-pointer hidden sm:block"
          onClick={() => scrollToSection('features')}
          role="button"
          tabIndex={0}
          aria-label="Défiler vers les fonctionnalités"
          onKeyDown={(e) => e.key === 'Enter' && scrollToSection('features')}
        >
          <svg 
            className="w-6 h-6 text-white/80" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </section>

      {/* Section "Pourquoi Sloti" - Stats du secteur */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Titre */}
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              La logistique manuelle{" "}
              <span className="text-red-600">coûte cher</span>
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Les entrepôts perdent du temps et de l'argent chaque jour à cause des processus manuels
            </p>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-10">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center border-t-4 border-red-500 hover:shadow-xl transition-shadow">
              <div className="text-4xl sm:text-5xl font-bold text-red-600 mb-3">
                87%
              </div>
              <p className="text-base sm:text-lg text-gray-700 font-medium mb-2">
                Des erreurs viennent<br className="hidden sm:block" /> du papier
              </p>
              <p className="text-xs text-gray-500">
                Source : Supply Chain Magazine 2024
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center border-t-4 border-orange-500 hover:shadow-xl transition-shadow">
              <div className="text-4xl sm:text-5xl font-bold text-orange-600 mb-3">
                3h/jour
              </div>
              <p className="text-base sm:text-lg text-gray-700 font-medium mb-2">
                Perdues en<br className="hidden sm:block" /> double saisie
              </p>
              <p className="text-xs text-gray-500">
                Source : Étude Gartner Logistics
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center border-t-4 border-red-500 hover:shadow-xl transition-shadow">
              <div className="text-4xl sm:text-5xl font-bold text-red-600 mb-3">
                15%
              </div>
              <p className="text-base sm:text-lg text-gray-700 font-medium mb-2">
                Du CA perdu à cause<br className="hidden sm:block" /> des stocks mal gérés
              </p>
              <p className="text-xs text-gray-500">
                Source : Aberdeen Group Research
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-[#2792B0] to-[#207A94] rounded-2xl shadow-xl p-8 sm:p-10 text-white">
            <div className="mb-4">
              <span className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold">
                ✨ La solution
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-4">
              Sloti résout ces 3 problèmes
            </h3>
            <p className="text-base sm:text-lg mb-6 max-w-2xl mx-auto text-white/90">
              Automatisez vos processus, éliminez les erreurs et gagnez des heures chaque jour 
              avec une plateforme tout-en-un
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                onClick={() => scrollToSection('pricing')}
                className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-white text-[#2792B0] hover:bg-gray-100 transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Voir les tarifs
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg border-2 border-white text-white hover:bg-white hover:text-[#2792B0] transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Découvrir les fonctionnalités
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}