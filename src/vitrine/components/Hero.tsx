// src/vitrine/components/Hero.tsx
import { useState, useEffect } from "react";
import heroImg from "../../assets/hero.svg"; 
import bgHero from "../../assets/bg-hero.png";

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
    <section
      className="relative text-white pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16 lg:pb-20 bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: `url(${bgHero})` }}
      aria-label="Section héro"
    >
      {/* Overlay pour améliorer la lisibilité */}
      <div className="absolute inset-0 bg-black/20" aria-hidden="true"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
        
        {/* Texte */}
        <div 
          className={`flex-1 text-center lg:text-left transition-all duration-1000 transform ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 sm:mb-6 drop-shadow-lg">
            Simplifiez vos réceptions et expéditions
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-100 mb-6 sm:mb-8 max-w-2xl mx-auto lg:mx-0 drop-shadow">
            Sloti est une solution moderne pour planifier vos flux
            logistiques et suivre vos stocks en temps réel.
          </p>

          {/* Boutons */}
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 sm:gap-4">
            <button
              onClick={() => scrollToSection('pricing')}
              className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-[#8BC34A] hover:bg-green-600 transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
              aria-label="Commencer avec Sloti"
            >
              Commencer
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg border-2 bg-black/30 backdrop-blur-sm border-white hover:bg-white hover:text-gray-900 transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50"
              aria-label="En savoir plus sur les fonctionnalités"
            >
              En savoir plus
            </button>
          </div>

          {/* Badges de confiance */}
          <div className="mt-8 sm:mt-10 flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-6 text-xs sm:text-sm">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full">
              <span className="text-green-400 font-bold">✓</span>
              <span className="font-medium">Gratuit 14 jours</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full">
              <span className="text-green-400 font-bold">✓</span>
              <span className="font-medium">Sans engagement</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full">
              <span className="text-green-400 font-bold">✓</span>
              <span className="font-medium">Support 24/7</span>
            </div>
          </div>
        </div>

        {/* Illustration */}
        <div 
          className={`flex-1 flex justify-center lg:justify-end transition-all duration-1000 delay-300 transform ${
            isVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
          }`}
        >
          <img
            src={heroImg}
            alt="Illustration de la plateforme Sloti montrant le tableau de bord de gestion logistique"
            className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl drop-shadow-2xl rounded-xl"
            loading="eager"
            width="800"
            height="600"
          />     
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
  );
}