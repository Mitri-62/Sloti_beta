import { useState, useEffect, FC } from "react";
import { Calendar, Package, Truck, BarChart3, Rocket, Users, ArrowDown, ChevronDown, LucideIcon, MessageCircle} from "lucide-react";

// URL de l'image de fond - Rendu configurable pour la réutilisation
const BACKGROUND_IMAGE_URL = "https://images.unsplash.com/photo-1553413077-190dd305871c?w=1920&q=80";
const MAIN_COLOR = "#2792B0"; // Couleur principale utilisée dans le site précédent

// Typage pour le composant (FC = Function Component)
const Hero: FC = () => {
  // État pour gérer les animations initiales
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Déclencher l'animation après le montage du composant
    // Ajout d'un petit délai (e.g., 50ms) pour garantir que l'état initial est bien 'false' avant le déclenchement
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timer); // Nettoyage
  }, []);

  // Fonction pour faire défiler la page vers une section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  // Ajout d'une animation custom simple via un style pour simuler un fade-up plus doux
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
        {/* Overlay renforcé et réactif (plus sombre) */}
        <div className="absolute inset-0 bg-black/70 sm:bg-black/60" aria-hidden="true"></div>
        
        {/* Dégradé supplémentaire - du bas pour accentuer le contenu */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" aria-hidden="true"></div>

        <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 text-center">
          
          {/* Badge "Bêta Privée" */}
          <div 
            className={`inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 rounded-full mb-6 border-2 border-white/30 shadow-2xl ${animationClass('delay-100')}`}
          >
            <span className="relative flex h-3 w-3">
              {/* Animation Ping (pulse) */}
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <Rocket size={20} className="text-white" />
            <span className="text-sm font-bold text-white drop-shadow-lg uppercase tracking-wide">
              BÊTA PRIVÉE - 15 places disponibles - Lancement Février 2025
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
            {/* Utilisation de la couleur du site pour l'identité */}
            <span className="text-[#8BC34A] drop-shadow-xl">supply chain</span>
            <br className="hidden sm:block" />
            de l'entrepôt à la livraison
          </h1>

          {/* Sous-titre - Augmentation légère du contraste */}
          <p 
            className={`text-lg sm:text-xl lg:text-2xl text-white/95 font-semibold mb-6 ${animationClass('delay-300')}`}
            style={{
              textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)'
            }}
          >
            Rejoignez les <span className="text-white font-black">15 premiers</span> utilisateurs
            <br className="hidden sm:block" />
            <span className="text-white font-black"> et économisez 57% à vie</span>
          </p>

          {/* Offre tarifaire en encadré - Rendu plus 'Premium' */}
          <div 
            className={`inline-flex flex-wrap justify-center items-center gap-x-4 gap-y-2 bg-gradient-to-r from-[#8BC34A] to-[#7CB342] px-8 py-3 rounded-xl mb-8 shadow-2xl border-2 border-white/30 ${animationClass('delay-400')}`}
          >
            <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">149€/mois</span>
            <span className="text-base sm:text-lg text-white/90">au lieu de</span>
            <span className="text-xl sm:text-2xl font-bold text-white/70 line-through">349€</span>
          </div>

          {/* Fonctionnalités rapides - Amélioration du fond pour le contraste */}
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

          {/* Boutons CTA - Utilisation d'un href pour le scroll plus standard */}
          <div 
            className={`flex flex-col sm:flex-row justify-center gap-4 mb-8 ${animationClass('delay-600')}`}
          >
            <a
              href="#devis"
              className="group px-8 py-4 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition-all duration-300 font-bold text-lg shadow-2xl hover:shadow-3xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-300 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Rocket className="group-hover:rotate-12 transition-transform" size={24} />
              Rejoindre la bêta (gratuit)
            </a>
            <a
              href="#beta-benefits"
              className="px-8 py-4 rounded-lg border-2 bg-black/40 backdrop-blur-md border-white hover:bg-white hover:text-gray-900 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/50 flex items-center justify-center whitespace-nowrap"
            >
              Voir les avantages
            </a>
          </div>

          {/* Badges de confiance - Version condensée */}
          <div 
            className={`inline-flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-xl ${animationClass('delay-700')}`}
          >
            <TrustBadge symbol="✓" text="Gratuit jusqu'au lancement" color="text-green-400" />
            <span className="text-white/40 hidden sm:block">•</span>
            <TrustBadge symbol="🔥" text="15 places seulement" color="text-red-400" />
            <span className="text-white/40 hidden sm:block">•</span>
            <TrustBadge symbol="⭐" text="Prix gelé à vie" color="text-yellow-400" />
          </div>
        </div>

        {/* Indicateur de scroll (Utilise un ChevronDown pour un look plus moderne) */}
        <a 
          href="#beta-benefits"
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce cursor-pointer p-2 rounded-full hover:bg-white/10 transition hidden sm:block"
          aria-label="Défiler vers les avantages"
        >
          <ChevronDown 
            className="w-8 h-8 text-white drop-shadow-lg" 
            strokeWidth={3}
            aria-hidden="true"
          />
        </a>
      </section>

      {/* Section "Pourquoi Sloti" - Stats avec message bêta */}
      <section id="beta-benefits" className="py-12 sm:py-16 bg-gradient-to-b from-blue-50 to-white">
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
            <StatCard value="87%" title="Des erreurs viennent du papier" source="Source : Supply Chain Magazine 2024" color="red" />
            <StatCard value="3h/jour" title="Perdues en double saisie" source="Source : Étude Gartner Logistics" color="orange" />
            <StatCard value="15%" title="Du CA perdu (stocks mal gérés)" source="Source : Aberdeen Group Research" color="red" />
          </div>

          {/* CTA Section */}
          <div className="text-center bg-gradient-to-r from-[#2792B0] to-[#207A94] rounded-2xl shadow-xl p-8 sm:p-10 text-white" id="devis">
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
              <a
                href="#" // Lien réel vers le formulaire de devis/inscription
                className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg bg-white text-[#2792B0] hover:bg-gray-100 transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Rejoindre la bêta
              </a>
              <a
                href="#features"
                className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg border-2 border-white text-white hover:bg-white hover:text-[#2792B0] transition-all duration-300 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Découvrir les fonctionnalités
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Hero;


// --- Sous-composants pour la lisibilité et la réutilisation ---

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

interface StatCardProps {
    value: string;
    title: string;
    source: string;
    color: 'red' | 'orange';
}

const StatCard: FC<StatCardProps> = ({ value, title, source, color }) => {
    const colorClass = {
        red: "border-red-500 text-red-600",
        orange: "border-orange-500 text-orange-600",
    }[color];
    
    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center border-t-4 hover:shadow-xl transition-shadow">
            <div className={`text-4xl sm:text-5xl font-bold mb-3 ${colorClass}`}>
                {value}
            </div>
            <p className="text-base sm:text-lg text-gray-700 font-medium mb-2">
                {title.split('(').map((part, index) => (
                    // Ajoute un saut de ligne pour les titres longs
                    <span key={index}>
                        {index > 0 && <br className="hidden sm:block" />}
                        {part}
                    </span>
                ))}
            </p>
            <p className="text-xs text-gray-500">
                {source}
            </p>
        </div>
    );
};