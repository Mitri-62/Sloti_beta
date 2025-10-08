// src/vitrine/components/Features.tsx
import { Truck, Package, BarChart3, Users, Clock, Shield, Smartphone, Zap } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Planification des expéditions",
    description: "Organisez facilement vos flux logistiques et gagnez en visibilité sur vos livraisons.",
    color: "blue",
  },
  {
    icon: Package,
    title: "Réceptions simplifiées",
    description: "Suivez et validez vos réceptions en quelques clics avec un processus digitalisé.",
    color: "green",
  },
  {
    icon: BarChart3,
    title: "Suivi en temps réel",
    description: "Visualisez vos stocks, expéditions et réceptions instantanément grâce à nos tableaux.",
    color: "purple",
  },
  {
    icon: Users,
    title: "Collaboration optimisée",
    description: "Invitez vos équipes et transporteurs pour une coordination sans friction.",
    color: "orange",
  },
  {
    icon: Clock,
    title: "Gain de temps",
    description: "Automatisez vos processus répétitifs et concentrez-vous sur l'essentiel.",
    color: "red",
  },
  {
    icon: Shield,
    title: "Données sécurisées",
    description: "Vos informations sont protégées avec les dernières technologies de sécurité.",
    color: "indigo",
  },
  {
    icon: Smartphone,
    title: "Mobile friendly",
    description: "Accédez à vos données depuis n'importe quel appareil, partout et à tout moment.",
    color: "pink",
  },
  {
    icon: Zap,
    title: "Performance optimale",
    description: "Interface rapide et réactive pour une expérience utilisateur fluide.",
    color: "yellow",
  },
];

const colorClasses = {
  blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
  green: "bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white",
  purple: "bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
  orange: "bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
  red: "bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white",
  indigo: "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
  pink: "bg-pink-100 text-pink-600 group-hover:bg-pink-600 group-hover:text-white",
  yellow: "bg-yellow-100 text-yellow-600 group-hover:bg-yellow-600 group-hover:text-white",
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
            Tout ce dont vous avez besoin pour gérer vos flux logistiques au quotidien avec efficacité.
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