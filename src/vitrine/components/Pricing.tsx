// src/vitrine/components/Pricing.tsx
import { Check, Star } from "lucide-react";

export default function Pricing() {
  const plans = [
    {
      name: "Essai gratuit",
      price: "0€",
      period: "14 jours",
      features: [
        "Dashboard complet",
        "Planning collaboratif",
        "Gestion de stock",
        "Chargement 3D automatique",
        "Tour planning",
        "Chat interne",
      ],
      button: "Commencer l'essai",
      highlight: false,
      popular: false,
    },
    {
      name: "Starter",
      price: "59€",
      period: "mois",
      features: [
        "Dashboard",
        "Planning collaboratif",
        "Gestion de stock",
        "Chargement 3D manuel",
        "Jusqu’à 2 utilisateurs",
      ],
      button: "Choisir ce plan",
      highlight: false,
      popular: false,
    },
    {
      name: "Pro",
      price: "99€",
      period: "mois",
      features: [
        "Dashboard",
        "Planning collaboratif multi-utilisateurs",
        "Chargement 3D automatique",
        "Tour planning (planification de tournées)",
        "Gestion de stock en temps réel",
        "Jusqu’à 10 utilisateurs",
        "Chat d’équipe intégré",
      ],
      button: "Commencer maintenant",
      highlight: true,
      popular: true,
    },
    {
      name: "Enterprise",
      price: "179€",
      period: "mois",
      features: [
        "Dashboard complet et personnalisable",
        "Planning et tour planning illimités",
        "Vue 3D complète (stocks + chargements combinés)",
        "Gestion multi-sites (plusieurs entrepôts / usines)",
        "Utilisateurs illimités et personnalisation visuelle",
        "Chat avancé + support prioritaire",
      ],
      button: "Demander une démo",
      highlight: false,
      popular: false,
    },
  ];
  return (
    <section 
      id="pricing" 
      className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-gray-50 to-white"
      aria-labelledby="pricing-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 
            id="pricing-title"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4"
          >
            Tarifs & <span className="text-[#2792B0]">Plans</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Choisissez le plan qui correspond à vos besoins. Changez à tout moment.
          </p>
        </div>

        {/* Grille de prix */}
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {plans.map((plan, i) => (
            <article
              key={i}
              className={`relative rounded-2xl shadow-lg p-6 sm:p-8 flex flex-col transition-all duration-300 ${
                plan.highlight
                  ? "bg-gradient-to-b from-[#2792B0] to-[#207A94] text-white scale-105 lg:scale-110 shadow-2xl"
                  : "bg-white text-gray-800 hover:shadow-xl hover:-translate-y-1"
              }`}
            >
              {/* Badge populaire */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-yellow-400 text-gray-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    <Star size={14} fill="currentColor" />
                    Le plus populaire
                  </span>
                </div>
              )}

              {/* Nom du plan */}
              <h3
                className={`text-xl sm:text-2xl font-semibold mb-2 ${
                  plan.highlight ? "text-white" : "text-gray-900"
                }`}
              >
                {plan.name}
              </h3>

              {/* Prix */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-bold">
                    {plan.price}
                  </span>
                  <span className={`text-lg ${plan.highlight ? "text-white/80" : "text-gray-600"}`}>
                    / {plan.period}
                  </span>
                </div>
              </div>

              {/* Fonctionnalités */}
              <ul className="flex-1 mb-6 sm:mb-8 space-y-3 text-sm sm:text-base">
                {plan.features.map((f, idx) => (
                  <li
                    key={idx}
                    className={`flex items-start gap-3 ${
                      plan.highlight ? "text-white" : "text-gray-700"
                    }`}
                  >
                    <Check 
                      className={`flex-shrink-0 w-5 h-5 ${
                        plan.highlight ? "text-green-300" : "text-green-600"
                      }`}
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* Bouton */}
              <button
                className={`w-full mt-auto px-6 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-all duration-300 focus:outline-none focus:ring-4 ${
                  plan.highlight
                    ? "bg-white text-[#2792B0] hover:bg-gray-100 focus:ring-white/50 shadow-lg"
                    : "bg-[#2792B0] text-white hover:bg-[#207A94] focus:ring-blue-300 hover:shadow-lg"
                }`}
                aria-label={`${plan.button} - Plan ${plan.name}`}
              >
                {plan.button}
              </button>
            </article>
          ))}
        </div>

        {/* Info complémentaire */}
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            💳 Paiement sécurisé • ❌ Sans engagement • 🔄 Résiliation à tout moment
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-gray-500">
            <span>Des questions sur nos tarifs ?</span>
            <a 
              href="#DevisForm" 
              className="text-[#2792B0] hover:text-[#207A94] font-semibold underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            >
              Contactez notre équipe
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}