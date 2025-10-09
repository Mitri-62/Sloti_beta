// src/vitrine/components/Features.tsx
import { LayoutDashboard, Calendar, Box, Layers, Truck, Package, TrendingUp, TrendingDown, Boxes, BarChart3, MessageSquare, Shield } from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Dashboard intuitif",
    description: "Accédez à toutes vos informations clés depuis un tableau de bord centralisé et personnalisable.",
    color: "blue",
  },
  {
    icon: Calendar,
    title: "Planning collaboratif",
    description: "Organisez vos réceptions et expéditions avec un planning partagé en temps réel.",
    color: "purple",
  },
  {
    icon: Box,
    title: "Chargement 3D",
    description: "Visualisez et optimisez le chargement de vos camions en 3D pour maximiser l'espace disponible.",
    color: "cyan",
  },
  {
    icon: Layers,
    title: "Chargement Auto",
    description: "Algorithme intelligent qui calcule automatiquement l'optimisation du chargement de vos palettes.",
    color: "green",
  },
  {
    icon: Truck,
    title: "Gestion des tournées",
    description: "Planifiez et optimisez vos tournées de livraison pour réduire les coûts et les délais.",
    color: "orange",
  },
  {
    icon: Package,
    title: "Gestion des stocks",
    description: "Suivez vos entrées, sorties et consultez l'état de vos stocks en temps réel.",
    color: "indigo",
  },
  {
    icon: TrendingUp,
    title: "Entrées de stock",
    description: "Enregistrez et suivez toutes vos réceptions de marchandises avec traçabilité complète.",
    color: "green",
  },
  {
    icon: TrendingDown,
    title: "Sorties de stock",
    description: "Gérez vos expéditions et mouvements de sortie avec validation et historique détaillé.",
    color: "red",
  },
  {
    icon: Boxes,
    title: "Vue Synoptique 3D",
    description: "Explorez votre entrepôt en 3D interactive et localisez instantanément vos palettes.",
    color: "teal",
  },
  {
    icon: BarChart3,
    title: "MasterData",
    description: "Centralisez et gérez toutes vos données de référence : articles, clients, fournisseurs.",
    color: "purple",
  },
  {
    icon: MessageSquare,
    title: "Messagerie intégrée",
    description: "Communiquez directement avec vos équipes et partenaires depuis la plateforme.",
    color: "pink",
  },
  {
    icon: Shield,
    title: "Sécurité renforcée",
    description: "Vos données sont protégées avec un chiffrement de bout en bout et des sauvegardes automatiques.",
    color: "gray",
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

export default function Features() {
  return (
    <section 
      id="features" 
      className="py-16 sm:py-20 lg:py-24 bg-white"
      aria-labelledby="features-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* En-tête */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 
            id="features-title"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4"
          >
            Les <span className="text-[#2792B0]">fonctionnalités</span> clés
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
            Une suite complète d'outils pour gérer efficacement vos opérations logistiques au quotidien.
          </p>
        </div>

        {/* Grille de fonctionnalités */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {features.map((feature, i) => (
            <article
              key={i}
              className="group flex flex-col items-center text-center p-6 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 bg-white border border-gray-100 hover:border-[#2792B0] hover:-translate-y-2"
            >
              <div 
                className={`w-16 h-16 flex items-center justify-center rounded-2xl mb-4 transition-all duration-300 ${
                  colorClasses[feature.color as keyof typeof colorClasses]
                }`}
                aria-hidden="true"
              >
                <feature.icon className="w-8 h-8" strokeWidth={2} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12 sm:mt-16">
          <a
            href="#pricing"
            className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#2792B0] to-[#207A94] text-white rounded-lg font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            Découvrir nos offres
            <svg 
              className="ml-2 w-5 h-5" 
              fill="none" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-hidden="true"
            >
              <path d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}