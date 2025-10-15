// src/vitrine/components/Features.tsx - SCREENSHOTS ALTERNÉS GAUCHE/DROITE
import { LayoutDashboard, Calendar, Box, Layers, Truck, Package, TrendingUp, TrendingDown, Boxes, BarChart3, MessageSquare, Shield, Zap, ArrowRight } from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Dashboard intuitif",
    description: "Toutes vos métriques clés en un coup d'œil : stocks, tournées, planning.",
    benefit: "Gain de temps : 45 min/jour",
    color: "blue",
    category: "pilotage"
  },
  {
    icon: Calendar,
    title: "Planning collaboratif",
    description: "Planifiez réceptions et expéditions en équipe, avec notifications automatiques.",
    benefit: "Zéro conflit de planning",
    color: "purple",
    category: "pilotage"
  },
  {
    icon: Box,
    title: "Chargement 3D",
    description: "Visualisez vos camions en temps réel et optimisez chaque centimètre cube.",
    benefit: "Jusqu'à 30% d'espace gagné",
    color: "cyan",
    category: "optimisation"
  },
  {
    icon: Layers,
    title: "Chargement Auto",
    description: "L'algorithme calcule le meilleur gerbage pour vos palettes en 5 secondes.",
    benefit: "Optimisation instantanée",
    color: "green",
    category: "optimisation"
  },
  {
    icon: Truck,
    title: "Gestion des tournées",
    description: "Optimisez routes et plannings de livraison avec GPS et suivi temps réel.",
    benefit: "Jusqu'à 20% de km en moins",
    color: "orange",
    category: "optimisation"
  },
  {
    icon: Package,
    title: "Gestion des stocks",
    description: "Suivi en temps réel des entrées/sorties avec alertes de rupture automatiques.",
    benefit: "Stocks toujours à jour",
    color: "indigo",
    category: "stocks"
  },
  {
    icon: TrendingUp,
    title: "Entrées de stock",
    description: "Scannez, validez et tracez chaque réception avec historique complet.",
    benefit: "Traçabilité totale",
    color: "green",
    category: "stocks"
  },
  {
    icon: TrendingDown,
    title: "Sorties de stock",
    description: "Gérez expéditions et préparations avec validation multi-niveaux.",
    benefit: "Zéro erreur d'expédition",
    color: "red",
    category: "stocks"
  },
  {
    icon: Boxes,
    title: "Vue Synoptique 3D",
    description: "Explorez votre entrepôt en 3D et localisez n'importe quelle palette instantanément.",
    benefit: "Recherche en 3 secondes",
    color: "teal",
    category: "stocks"
  },
  {
    icon: BarChart3,
    title: "MasterData",
    description: "Base centralisée de tous vos articles, clients et fournisseurs avec import Excel.",
    benefit: "Une seule source de vérité",
    color: "purple",
    category: "pilotage"
  },
  {
    icon: MessageSquare,
    title: "Chat intégré",
    description: "Communiquez en direct avec toute l'équipe, sans quitter la plateforme.",
    benefit: "Communication instantanée",
    color: "pink",
    category: "collaboration"
  },
  {
    icon: Shield,
    title: "Sécurité renforcée",
    description: "Chiffrement de bout en bout, sauvegardes automatiques et conformité RGPD.",
    benefit: "Données 100% sécurisées",
    color: "gray",
    category: "collaboration"
  },
];

const colorClasses = {
  blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
  green: "bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white",
  cyan: "bg-cyan-100 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white",
  teal: "bg-teal-100 text-teal-600 group-hover:bg-teal-600 group-hover:text-white",
  purple: "bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
  orange: "bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
  red: "bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white",
  indigo: "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
  pink: "bg-pink-100 text-pink-600 group-hover:bg-pink-600 group-hover:text-white",
  gray: "bg-gray-100 text-gray-600 group-hover:bg-gray-600 group-hover:text-white",
};

const categoryLabels = {
  pilotage: { 
    label: "Pilotage", 
    icon: "🎯", 
    color: "blue",
    screenshot: "/screenshots/dashboard.png",
    screenshotAlt: "Interface du dashboard Sloti avec métriques en temps réel",
    layout: "right" // Screenshot à droite
  },
  optimisation: { 
    label: "Optimisation", 
    icon: "⚡", 
    color: "green",
    screenshot: "/screenshots/chargement-3d.png",
    screenshotAlt: "Visualisation 3D du chargement optimisé d'un camion",
    layout: "left" // Screenshot à gauche
  },
  stocks: { 
    label: "Stocks", 
    icon: "📦", 
    color: "purple",
    screenshot: "/screenshots/stock-3d.png",
    screenshotAlt: "Vue synoptique 3D de l'entrepôt avec localisation des palettes",
    layout: "right" // Screenshot à droite
  },
  collaboration: { 
    label: "Collaboration", 
    icon: "🤝", 
    color: "pink",
    screenshot: "/screenshots/chat.png",
    screenshotAlt: "Interface de chat d'équipe intégré",
    layout: "left" // Screenshot à gauche
  }
};

export default function Features() {
  return (
    <section 
      id="features" 
      className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white to-gray-50"
      aria-labelledby="features-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* En-tête */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full mb-4">
            <Zap size={18} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-600">
              12 fonctionnalités puissantes
            </span>
          </div>
          
          <h2 
            id="features-title"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4"
          >
            Tout ce dont vous avez besoin,{" "}
            <span className="text-[#2792B0]">rien de superflu</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
            Une suite complète pour automatiser vos flux logistiques, 
            du planning au chargement en passant par le suivi en temps réel.
          </p>
        </div>

        {/* Catégories avec alternance screenshot/cards */}
        {Object.entries(categoryLabels).map(([categoryKey, categoryInfo],) => {
          const categoryFeatures = features.filter(f => f.category === categoryKey);
          const isImageLeft = categoryInfo.layout === "left";
          
          return (
            <div key={categoryKey} className="mb-16 sm:mb-20">
              {/* Titre de catégorie */}
              <div className="flex items-center gap-3 mb-8 sm:mb-10">
                <div className={`w-12 h-12 rounded-xl bg-${categoryInfo.color}-100 flex items-center justify-center text-2xl`}>
                  {categoryInfo.icon}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {categoryInfo.label}
                </h3>
              </div>

              {/* Layout alterné : Screenshot + Cards */}
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
                isImageLeft ? 'lg:flex-row-reverse' : ''
              }`}>
                
                {/* Screenshot */}
                <div className={`${isImageLeft ? 'lg:order-1' : 'lg:order-2'}`}>
                  <div className="group relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
                    <img 
                      src={categoryInfo.screenshot} 
                      alt={categoryInfo.screenshotAlt}
                      className="w-full h-auto group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {/* Overlay au hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <p className="text-white text-lg font-semibold flex items-center gap-2">
                          <Zap size={20} className="text-yellow-400" />
                          {categoryInfo.label} en action
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cards des fonctionnalités */}
                <div className={`space-y-6 ${isImageLeft ? 'lg:order-2' : 'lg:order-1'}`}>
                  {categoryFeatures.map((feature, i) => (
                    <article
                      key={i}
                      className="group flex items-start gap-4 p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 bg-white border border-gray-100 hover:border-[#2792B0] hover:-translate-x-1"
                    >
                      {/* Icône */}
                      <div 
                        className={`flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl transition-all duration-300 ${
                          colorClasses[feature.color as keyof typeof colorClasses]
                        }`}
                      >
                        <feature.icon className="w-7 h-7" strokeWidth={2} />
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          {feature.title}
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">
                          {feature.description}
                        </p>
                        
                        {/* Bénéfice */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="text-sm font-semibold text-[#2792B0] flex items-center gap-2">
                            <ArrowRight size={14} />
                            {feature.benefit}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Bannière finale - VERSION CORRIGÉE */}
        <div className="mt-16 bg-gradient-to-r from-[#2792B0] to-[#207A94] rounded-2xl shadow-xl p-8 sm:p-10 text-white text-center">
        <h3 className="text-2xl sm:text-3xl font-bold mb-4">
        Toutes les fonctionnalités. Aucun module caché.
        </h3>
        <p className="text-base sm:text-lg mb-6 text-white/90 max-w-2xl mx-auto">
        Du plan Starter au plan Enterprise, chaque fonctionnalité annoncée est 
        accessible immédiatement. Testez gratuitement pendant 14 jours.
        </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-white text-[#2792B0] rounded-lg font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Voir les tarifs
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
            <a
              href="#DevisForm"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 border-2 border-white text-white hover:bg-white hover:text-[#2792B0] rounded-lg font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Demander une démo
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}