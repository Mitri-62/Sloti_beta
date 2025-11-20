import { useState, useEffect } from "react";
import { Calendar, Package, Truck, BarChart3, Rocket, Users } from "lucide-react";

const bgHero = "https://images.unsplash.com/photo-1553413077-190dd305871c?w=1920&q=80";

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
      {/* Hero Principal */}
      <section
        className="relative text-white pt-32 sm:pt-40 lg:pt-48 pb-20 sm:pb-28 lg:pb-32 bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: `url(${bgHero})` }}
        aria-label="Section héro"
      >
        {/* Overlay renforcé */}
        <div className="absolute inset-0 bg-black/" aria-hidden="true"></div>
        
        {/* Dégradé supplémentaire */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" aria-hidden="true"></div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 text-center">
          
          {/* Badge "Bêta Privée" */}
          <div 
            className={`inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 rounded-full mb-6 border-2 border-white/30 shadow-2xl transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <Rocket size={20} className="text-white" />
            <span className="text-sm font-bold text-white drop-shadow-lg">
              BÊTA PRIVÉE - 15 places disponibles - Lancement Février 2025
            </span>
          </div>

          {/* Titre principal */}
          <h1 
            className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 sm:mb-8 transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{
              textShadow: '0 4px 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)'
            }}
          >
            Optimisez votre{" "}
            <span className="text-[#8BC34A]">supply chain</span>
            <br />
            de l'entrepôt à la livraison
          </h1>

          {/* Sous-titre simplifié */}
          <p 
            className={`text-lg sm:text-xl lg:text-2xl text-white font-semibold mb-6 transition-all duration-1000 delay-200 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{
              textShadow: '0 2px 8px rgba(0,0,0,0.8)'
            }}
          >
            Rejoignez les <span className="text-[#fafaf9] font-bold">15 premiers</span> utilisateurs
            <br className="hidden sm:block" />
            <span className="text-[#f9faf8] font-bold"> et économisez 57% à vie</span>
          </p>

          {/* Offre tarifaire en encadré */}
          <div 
            className={`inline-flex items-center gap-3 bg-gradient-to-r from-[#8BC34A] to-[#7CB342] px-6 py-3 rounded-xl mb-8 shadow-2xl border-2 border-white/30 transition-all duration-1000 delay-250 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <span className="text-2xl sm:text-3xl font-black text-white">149€/mois</span>
            <span className="text-base sm:text-lg text-white/90">au lieu de</span>
            <span className="text-xl sm:text-2xl font-bold text-white/70 line-through">349€</span>
          </div>

          {/* Fonctionnalités rapides - Format compact */}
          <div 
            className={`flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10 max-w-3xl mx-auto transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-blue-300/30 shadow-lg">
              <Calendar size={18} className="text-blue-300" />
              <span className="text-sm font-medium">Planning auto</span>
            </div>
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-purple-300/30 shadow-lg">
              <Package size={18} className="text-purple-300" />
              <span className="text-sm font-medium">Chargement 3D</span>
            </div>
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-orange-300/30 shadow-lg">
              <Truck size={18} className="text-orange-300" />
              <span className="text-sm font-medium">Tournées optimisées</span>
            </div>
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border border-green-300/30 shadow-lg">
              <BarChart3 size={18} className="text-green-300" />
              <span className="text-sm font-medium">Stocks temps réel</span>
            </div>
          </div>

          {/* Boutons CTA */}
          <div 
            className={`flex flex-col sm:flex-row justify-center gap-4 mb-8 transition-all duration-1000 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <button
              onClick={() => scrollToSection('devis')}
              className="group px-8 py-4 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition-all duration-300 font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-300 flex items-center justify-center gap-2"
            >
              <Rocket className="group-hover:rotate-12 transition-transform" size={24} />
              Rejoindre la bêta (gratuit)
            </button>
            <button
              onClick={() => scrollToSection('beta-benefits')}
              className="px-8 py-4 rounded-lg border-2 bg-black/40 backdrop-blur-md border-white hover:bg-white hover:text-gray-900 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50"
            >
              Voir les avantages
            </button>
          </div>

          {/* Badges de confiance - Version condensée */}
          <div 
            className={`inline-flex flex-wrap justify-center gap-4 text-sm bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-xl transition-all duration-1000 delay-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-bold text-base">✓</span>
              <span className="font-semibold">Gratuit jusqu'au lancement</span>
            </div>
            <span className="text-white/40">•</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">🔥</span>
              <span className="font-semibold">15 places seulement</span>
            </div>
            <span className="text-white/40">•</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">⭐</span>
              <span className="font-semibold">Prix gelé à vie</span>
            </div>
          </div>
        </div>

        {/* Indicateur de scroll */}
        <div 
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce cursor-pointer hidden sm:block"
          onClick={() => scrollToSection('beta-benefits')}
          role="button"
          tabIndex={0}
          aria-label="Défiler vers les avantages"
          onKeyDown={(e) => e.key === 'Enter' && scrollToSection('beta-benefits')}
        >
          <svg 
            className="w-6 h-6 text-white drop-shadow-lg" 
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

      {/* Section "Pourquoi Sloti" - Stats avec message bêta */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Titre */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-full mb-4">
              <Users size={18} className="text-orange-600" />
              <span className="text-sm font-semibold text-orange-600">
                Développé par un professionnel du terrain
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              La logistique manuelle{" "}
              <span className="text-red-600">coûte cher</span>
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Après 15 ans en entrepôt, j'ai créé Sloti pour résoudre les vrais problèmes du terrain
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
                Du CA perdu<br className="hidden sm:block" /> (stocks mal gérés)
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
              Rejoignez la bêta privée et testez gratuitement jusqu'au lancement officiel
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                onClick={() => scrollToSection('devis')}
                className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-white text-[#2792B0] hover:bg-gray-100 transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Rejoindre la bêta
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