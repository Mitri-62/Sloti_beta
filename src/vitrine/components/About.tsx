// src/vitrine/components/About.tsx - VERSION AMÉLIORÉE
import { CheckCircle, Package, Code, Sparkles, ArrowRight } from "lucide-react";

export default function About() {
  return (
    <section 
      id="about" 
      className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white to-gray-50"
      aria-labelledby="about-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Colonne gauche - Stats visuelles */}
          <div className="relative order-2 lg:order-1">
            {/* Carte principale avec stats */}
            <div className="bg-gradient-to-br from-[#2792B0] to-[#207A94] rounded-2xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
              {/* Pattern décoratif */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16"></div>
              
              <div className="relative z-10">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  {/* Stat 1 */}
                  <div className="text-center bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <div className="text-5xl font-bold mb-2">13</div>
                    <div className="text-sm text-white/90 font-medium">années en logistique</div>
                  </div>
                  
                  {/* Stat 2 */}
                  <div className="text-center bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <div className="text-5xl font-bold mb-2">2</div>
                    <div className="text-sm text-white/90 font-medium">ans de développement</div>
                  </div>
                  
                  {/* Stat 3 */}
                  <div className="text-center bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <div className="text-5xl font-bold mb-2">4</div>
                    <div className="text-sm text-white/90 font-medium">métiers maîtrisés</div>
                  </div>
                  
                  {/* Stat 4 */}
                  <div className="text-center bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <div className="text-5xl font-bold mb-2">100%</div>
                    <div className="text-sm text-white/90 font-medium">terrain</div>
                  </div>
                </div>
                
                {/* Citation avec meilleur contraste */}
                <div className="pt-6 border-t border-white/30 bg-white/5 -mx-8 sm:-mx-10 px-8 sm:px-10 pb-8 sm:pb-10 -mb-8 sm:-mb-10 rounded-b-2xl backdrop-blur-sm">
                  <p className="text-lg sm:text-xl italic text-center font-medium">
                    "J'ai créé l'outil que j'aurais voulu avoir quand j'étais cariste."
                  </p>
                  <p className="text-sm text-white/90 mt-3 text-center font-semibold">
                    — Fondateur de Sloti
                  </p>
                </div>
              </div>
            </div>
            
            {/* Badges flottants - CORRECTION backdrop-blur */}
            <div className="absolute -top-4 -right-6 bg-white rounded-lg shadow-xl p-3 sm:p-4 border border-gray-200 hover:scale-105 transition-transform z-20">
            <div className="flex items-center gap-2">
            <Package className="text-[#2792B0]" size={20} />
            <span className="font-semibold text-sm whitespace-nowrap">13 ans terrain</span>
            </div>
                </div>

<div className="absolute -bottom-4 -left-6 bg-white rounded-lg shadow-xl p-3 sm:p-4 border border-gray-200 hover:scale-105 transition-transform z-20">
  <div className="flex items-center gap-2">
    <Code className="text-green-600" size={20} />
    <span className="font-semibold text-sm whitespace-nowrap">Dev full-stack</span>
  </div>
</div>
          </div>

          {/* Colonne droite - Texte */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full mb-6">
              <CheckCircle size={18} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-600">
                Créé par un professionnel du terrain
              </span>
            </div>

            <h2 
              id="about-title"
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6 leading-tight"
            >
              De cariste à développeur :{" "}
              <span className="text-[#2792B0]">je connais vos galères</span>
            </h2>

            <div className="space-y-4 text-gray-700 text-base sm:text-lg mb-8 leading-relaxed">
              <p>
                J'ai passé <strong className="text-gray-900">13 ans en entrepôt</strong> : préparateur de commandes, 
                cariste, technicien, puis CI digital/dev.
              </p>
              
              <p>
                J'ai <strong className="text-gray-900">vécu les erreurs</strong>, les heures perdues à planifier manuellement, 
                les camions mal chargés, les stocks approximatifs.
              </p>

              <p className="font-semibold text-gray-900 text-lg">
                C'est pourquoi j'ai créé Sloti : l'outil que j'aurais voulu avoir 
                quand j'étais sur le terrain.
              </p>
            </div>

            {/* Parcours compact avec timeline visuelle */}
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 mb-8 border-2 border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2 text-lg">
                <Sparkles className="text-[#2792B0]" size={22} />
                Mon parcours
              </h3>
              <div className="space-y-4 text-sm relative">
                {/* Ligne verticale */}
                <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-[#2792B0]/30"></div>
                
                <div className="flex items-start gap-3 relative">
                  <div className="w-5 h-5 bg-[#2792B0] rounded-full flex-shrink-0 mt-0.5 border-4 border-white shadow-md z-10"></div>
                  <div className="flex-1 pt-0.5">
                    <span className="font-semibold text-gray-900">2013-2017</span>
                    <span className="text-gray-600"> • Préparateur & Cariste</span>
                    <div className="text-xs text-gray-500 mt-1">6 ans à manutentionner, préparer, optimiser</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 relative">
                  <div className="w-5 h-5 bg-[#2792B0] rounded-full flex-shrink-0 mt-0.5 border-4 border-white shadow-md z-10"></div>
                  <div className="flex-1 pt-0.5">
                    <span className="font-semibold text-gray-900">2017-2025</span>
                    <span className="text-gray-600"> • Technicien & CI Digital</span>
                    <div className="text-xs text-gray-500 mt-1">Automatisation Excel, amélioration continue</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 relative">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex-shrink-0 mt-0.5 border-4 border-white shadow-md z-10 animate-pulse"></div>
                  <div className="flex-1 pt-0.5">
                    <span className="font-semibold text-green-600">2023-2025</span>
                    <span className="text-gray-900 font-medium"> • Création de Sloti</span>
                    <div className="text-xs text-gray-700 mt-1 font-medium">2 ans de R&D • Lancement Q1 2025</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTAs améliorés */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="#features"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#2792B0] text-white rounded-lg font-semibold text-base hover:bg-[#207A94] transition-all hover:scale-105 shadow-lg hover:shadow-xl group"
              >
                Découvrir les fonctionnalités
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#2792B0] border-2 border-[#2792B0] rounded-lg font-semibold text-base hover:bg-gray-50 transition-all hover:scale-105 shadow-md hover:shadow-lg"
              >
                Voir les tarifs
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}