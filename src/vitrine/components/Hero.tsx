import { useState, useEffect, FC } from "react";
import { Calendar, Package, Truck, BarChart3, Rocket, Users, ChevronDown, LucideIcon, MessageCircle, Gift } from "lucide-react";

const BACKGROUND_IMAGE_URL = "https://images.unsplash.com/photo-1553413077-190dd305871c?w=1920&q=80";

const Hero: FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const animationClass = (delay: string) => 
    `transition-all duration-1000 ease-out ${delay} ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 blur-md'
    }`;
    
  return (
    <>
      {/* Hero Principal */}
      <section
        className="relative text-white pt-32 sm:pt-40 lg:pt-48 pb-20 sm:pb-28 lg:pb-32 bg-cover bg-center overflow-hidden min-h-[70vh] flex items-center"
        style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})` }}
        aria-label="Section héro et offre Bêta Privée"
      >
        <div className="absolute inset-0 bg-black/70 sm:bg-black/60" aria-hidden="true"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" aria-hidden="true"></div>

        <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 text-center">
          
          {/* Badge "Bêta Privée" */}
          <div 
            className={`inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 rounded-full mb-6 border-2 border-white/30 shadow-2xl ${animationClass('delay-100')}`}
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <Rocket size={20} className="text-white" />
            <span className="text-sm font-bold text-white drop-shadow-lg uppercase tracking-wide">
              BÊTA PRIVÉE - 14 places disponibles - Lancement Mars 2026
            </span>
          </div>

          {/* Titre principal */}
          <h1 
            className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 sm:mb-8 text-white ${animationClass('delay-200')}`}
            style={{
              textShadow: '0 4px 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)'
            }}
          >
            Optimisez votre{" "}
            <span className="text-[#8BC34A] drop-shadow-xl">supply chain</span>
            <br className="hidden sm:block" />
            de l'entrepôt à la livraison
          </h1>

          {/* Sous-titre CORRIGÉ - Message clair sur la gratuité */}
          <p 
            className={`text-lg sm:text-xl lg:text-2xl text-white/95 font-semibold mb-6 ${animationClass('delay-300')}`}
            style={{
              textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)'
            }}
          >
            Rejoignez les <span className="text-white font-black">15 premiers</span> beta testeurs
          </p>

          {/* NOUVEAU : Encadré Timeline claire */}
          <div 
            className={`inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-6 bg-black/50 backdrop-blur-md px-6 py-4 rounded-2xl mb-6 border border-white/20 ${animationClass('delay-350')}`}
          >
            {/* Étape 1 : Gratuit */}
            <div className="flex items-center gap-2">
              <Gift className="text-green-400" size={24} />
              <div className="text-left">
                <div className="text-green-400 font-bold text-lg">GRATUIT</div>
                <div className="text-white/70 text-sm">Déc. 2025 → Fév. 2026</div>
              </div>
            </div>
            
            {/* Flèche */}
            <div className="hidden sm:block text-white/50 text-2xl">→</div>
            <div className="sm:hidden text-white/50 text-xl">↓</div>
            
            {/* Étape 2 : Prix à vie */}
            <div className="flex items-center gap-2">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[#8BC34A] font-bold text-lg">149€/mois</span>
                  <span className="text-white/50 line-through text-sm">349€</span>
                </div>
                <div className="text-white/70 text-sm">À vie, dès mars 2026</div>
              </div>
            </div>
          </div>

          

          {/* Fonctionnalités rapides */}
          <div 
            className={`flex flex-wrap justify-center gap-2 sm:gap-4 mb-8 sm:mb-10 max-w-4xl mx-auto ${animationClass('delay-500')}`}
          >
            <FeatureBadge icon={Calendar} label="Planning auto" color="blue" />
            <FeatureBadge icon={Package} label="Chargement 3D" color="purple" />
            <FeatureBadge icon={Truck} label="Tournées optimisées" color="orange" />
            <FeatureBadge icon={BarChart3} label="Stocks temps réel 3D" color="green" />
            <FeatureBadge icon={Users} label="Flotte & Chauffeurs" color="teal" />
            <FeatureBadge icon={MessageCircle} label="Communication interne" color="purple" />
          </div>

          {/* Bouton CTA - Pointe vers #demo */}
          <div 
            className={`flex flex-col sm:flex-row justify-center gap-4 mb-8 ${animationClass('delay-600')}`}
          >
            <a
              href="#demo"
              className="group px-8 py-4 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition-all duration-300 font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-300 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Calendar className="group-hover:rotate-12 transition-transform" size={24} />
              Réserver ma démo gratuite
            </a>
          </div>

          {/* Badges de confiance CORRIGÉS */}
          <div 
            className={`inline-flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-xl ${animationClass('delay-700')}`}
          >
            <TrustBadge symbol="🎁" text="3 mois gratuits" color="text-green-400" />
            <span className="text-white/40 hidden sm:block">•</span>
            <TrustBadge symbol="🔥" text="14 places seulement" color="text-red-400" />
            <span className="text-white/40 hidden sm:block">•</span>
            <TrustBadge symbol="⭐" text="Puis 149€/mois à vie" color="text-yellow-400" />
          </div>
        </div>

        {/* Indicateur de scroll */}
        <a 
          href="#features"
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce cursor-pointer p-2 rounded-full hover:bg-white/10 transition hidden sm:block"
          aria-label="Défiler vers les fonctionnalités"
        >
          <ChevronDown 
            className="w-8 h-8 text-white drop-shadow-lg" 
            strokeWidth={3}
            aria-hidden="true"
          />
        </a>
      </section>
    </>
  );
}

export default Hero;


// --- Sous-composants ---

interface FeatureBadgeProps {
  icon: LucideIcon;
  label: string;
  color: 'blue' | 'purple' | 'orange' | 'green' | 'teal';
}

const FeatureBadge: FC<FeatureBadgeProps> = ({ icon: Icon, label, color }) => {
  const colorClass = {
    blue: "border-blue-300/50 text-blue-300",
    purple: "border-purple-300/50 text-purple-300",
    orange: "border-orange-300/50 text-orange-300",
    green: "border-green-300/50 text-green-300",
    teal: "border-teal-300/50 text-teal-300",
  }[color];

  return (
    <div className={`flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-2 rounded-lg border shadow-lg ${colorClass}`}>
      <Icon size={18} aria-hidden="true" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
};

interface TrustBadgeProps {
    symbol: string;
    text: string;
    color: string;
}

const TrustBadge: FC<TrustBadgeProps> = ({ symbol, text, color }) => (
    <div className="flex items-center gap-2">
      <span className={`font-bold text-base ${color}`}>{symbol}</span>
      <span className="font-semibold">{text}</span>
    </div>
);