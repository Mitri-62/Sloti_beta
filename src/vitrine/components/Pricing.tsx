import { useState } from "react";
import { Check, X, Star, Zap, Info } from "lucide-react";

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [showComparison, setShowComparison] = useState(false);

  const plans = [
    {
      name: "Essai gratuit",
      price: { monthly: 0, yearly: 0 },
      period: "14 jours",
      description: "Testez toutes les fonctionnalités",
      features: [
        { name: "Dashboard complet", included: true },
        { name: "Planning collaboratif", included: true },
        { name: "Gestion de stock", included: true },
        { name: "Chargement 3D automatique", included: true },
        { name: "Tour planning", included: true },
        { name: "Chat interne", included: true },
        { name: "Utilisateurs", value: "Illimité (14j)" },
        { name: "Support", value: "Email" },
      ],
      button: "Commencer l'essai",
      highlight: false,
      popular: false,
      color: "gray",
    },
    {
      name: "Starter",
      price: { monthly: 59, yearly: 49 },
      period: "par mois",
      description: "Pour les petites équipes",
      features: [
        { name: "Dashboard complet", included: true },
        { name: "Planning collaboratif", included: true },
        { name: "Gestion de stock", included: true },
        { name: "Chargement 3D manuel", included: true },
        { name: "Tour planning", included: false },
        { name: "Chat interne", included: true },
        { name: "Utilisateurs", value: "Jusqu'à 2" },
        { name: "Support", value: "Email prioritaire" },
      ],
      button: "Choisir Starter",
      highlight: false,
      popular: false,
      color: "blue",
    },
    {
      name: "Pro",
      price: { monthly: 99, yearly: 82 },
      period: "par mois",
      description: "Le plus populaire",
      features: [
        { name: "Dashboard complet", included: true },
        { name: "Planning collaboratif multi-utilisateurs", included: true },
        { name: "Gestion de stock en temps réel", included: true },
        { name: "Chargement 3D automatique", included: true },
        { name: "Tour planning avancé", included: true },
        { name: "Chat d'équipe intégré", included: true },
        { name: "Utilisateurs", value: "Jusqu'à 10" },
        { name: "Support", value: "Prioritaire 24/7" },
      ],
      button: "Commencer maintenant",
      highlight: true,
      popular: true,
      color: "purple",
    },
    {
      name: "Enterprise",
      price: { monthly: 179, yearly: 149 },
      period: "par mois",
      description: "Pour les grandes entreprises",
      features: [
        { name: "Dashboard personnalisable", included: true },
        { name: "Planning illimité multi-sites", included: true },
        { name: "Vue 3D complète (stocks + chargements)", included: true },
        { name: "Chargement 3D automatique avancé", included: true },
        { name: "Tour planning + optimisation IA", included: true },
        { name: "Chat avancé + visioconférence", included: true },
        { name: "Utilisateurs", value: "Illimités" },
        { name: "Support", value: "Dédié + gestionnaire" },
      ],
      button: "Demander une démo",
      highlight: false,
      popular: false,
      color: "indigo",
    },
  ];

  const getPrice = (plan: typeof plans[0]) => {
    const price = billingCycle === "monthly" ? plan.price.monthly : plan.price.yearly;
    return price;
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (billingCycle === "yearly" && plan.price.monthly > 0) {
      const yearlySavings = (plan.price.monthly - plan.price.yearly) * 12;
      return yearlySavings;
    }
    return 0;
  };

  return (
    <section 
      id="pricing" 
      className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-gray-50 to-white"
      aria-labelledby="pricing-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-12">
          <h2 
            id="pricing-title"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4"
          >
            Tarifs & <span className="text-[#2792B0]">Plans</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Choisissez le plan qui correspond à vos besoins. Changez à tout moment.
          </p>

          {/* Toggle mensuel/annuel */}
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1 mb-6">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-gray-900 shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                billingCycle === "yearly"
                  ? "bg-white text-gray-900 shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Annuel
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                -17%
              </span>
            </button>
          </div>

          {/* Bouton comparateur */}
          <div className="mt-4">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="text-[#2792B0] hover:text-[#207A94] font-medium underline inline-flex items-center gap-2"
            >
              <Info size={18} />
              {showComparison ? "Masquer" : "Afficher"} le comparateur détaillé
            </button>
          </div>
        </div>

        {/* Grille de prix */}
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {plans.map((plan, i) => {
            const price = getPrice(plan);
            const savings = getSavings(plan);

            return (
              <article
                key={i}
                className={`relative rounded-2xl shadow-lg p-6 sm:p-8 flex flex-col transition-all duration-300 ${
                  plan.highlight
                    ? "bg-gradient-to-b from-[#2792B0] to-[#207A94] text-white scale-105 lg:scale-110 shadow-2xl border-2 border-[#2792B0]"
                    : "bg-white text-gray-800 hover:shadow-xl hover:-translate-y-1 border border-gray-200"
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

                {/* Description */}
                <p className={`text-sm mb-6 ${plan.highlight ? "text-white/90" : "text-gray-600"}`}>
                  {plan.description}
                </p>

                {/* Prix */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-bold">
                      {price}€
                    </span>
                    <span className={`text-lg ${plan.highlight ? "text-white/80" : "text-gray-600"}`}>
                      {plan.name === "Essai gratuit" ? "" : `/ ${plan.period}`}
                    </span>
                  </div>
                  {billingCycle === "yearly" && savings > 0 && (
                    <p className={`text-sm mt-2 ${plan.highlight ? "text-green-300" : "text-green-600"} font-medium`}>
                      💰 Économisez {savings}€/an
                    </p>
                  )}
                </div>

                {/* Fonctionnalités principales */}
                <ul className="flex-1 mb-6 sm:mb-8 space-y-3 text-sm">
                  {plan.features.slice(0, 6).map((feature, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start gap-3 ${
                        plan.highlight ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {typeof feature === "object" && "included" in feature ? (
                        feature.included ? (
                          <Check 
                            className={`flex-shrink-0 w-5 h-5 ${
                              plan.highlight ? "text-green-300" : "text-green-600"
                            }`}
                            strokeWidth={3}
                          />
                        ) : (
                          <X 
                            className={`flex-shrink-0 w-5 h-5 ${
                              plan.highlight ? "text-red-300" : "text-red-400"
                            }`}
                            strokeWidth={3}
                          />
                        )
                      ) : (
                        <Check 
                          className={`flex-shrink-0 w-5 h-5 ${
                            plan.highlight ? "text-green-300" : "text-green-600"
                          }`}
                          strokeWidth={3}
                        />
                      )}
                      <span>
                        {typeof feature === "object" ? feature.name : feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Utilisateurs & Support */}
                <div className={`mb-6 space-y-2 text-sm ${plan.highlight ? "text-white/90" : "text-gray-600"}`}>
                  <div className="flex items-center justify-between py-2 border-t border-gray-200/20">
                    <span className="font-medium">👥 Utilisateurs</span>
                    <span>{plan.features.find(f => typeof f === "object" && "value" in f && f.name === "Utilisateurs")?.value}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-gray-200/20">
                    <span className="font-medium">💬 Support</span>
                    <span>{plan.features.find(f => typeof f === "object" && "value" in f && f.name === "Support")?.value}</span>
                  </div>
                </div>

                {/* Bouton */}
                <button
                  className={`w-full mt-auto px-6 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-all duration-300 focus:outline-none focus:ring-4 ${
                    plan.highlight
                      ? "bg-white text-[#2792B0] hover:bg-gray-100 focus:ring-white/50 shadow-lg hover:scale-105"
                      : "bg-[#2792B0] text-white hover:bg-[#207A94] focus:ring-blue-300 hover:shadow-lg"
                  }`}
                  aria-label={`${plan.button} - Plan ${plan.name}`}
                >
                  {plan.button}
                </button>
              </article>
            );
          })}
        </div>

        {/* Comparateur de fonctionnalités */}
        {showComparison && (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-12 overflow-x-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Zap className="text-[#2792B0]" size={28} />
              Comparaison détaillée des fonctionnalités
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="pb-4 pr-4 font-semibold text-gray-900 text-left sticky left-0 bg-white">
                      Fonctionnalité
                    </th>
                    {plans.map((plan, i) => (
                      <th key={i} className="pb-4 px-4 text-center font-semibold text-gray-900 min-w-[140px]">
                        <div className={`${plan.highlight ? 'text-[#2792B0]' : ''}`}>
                          {plan.name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Dashboard */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 pr-4 text-gray-700 font-medium sticky left-0 bg-white">
                      Dashboard
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Complet</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Complet</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Complet</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Personnalisable</div>
                    </td>
                  </tr>

                  {/* Planning */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 pr-4 text-gray-700 font-medium sticky left-0 bg-white">
                      Planning collaboratif
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Multi-utilisateurs</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Multi-sites</div>
                    </td>
                  </tr>

                  {/* Gestion de stock */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 pr-4 text-gray-700 font-medium sticky left-0 bg-white">
                      Gestion de stock
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Temps réel</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Temps réel</div>
                    </td>
                  </tr>

                  {/* Chargement 3D */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 pr-4 text-gray-700 font-medium sticky left-0 bg-white">
                      Chargement 3D
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Automatique</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-orange-500" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Manuel</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Automatique</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Avancé + IA</div>
                    </td>
                  </tr>

                  {/* Vue 3D Stock */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 pr-4 text-gray-700 font-medium sticky left-0 bg-white">
                      Vue Synoptique 3D
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <X className="inline-block text-red-400" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Complète</div>
                    </td>
                  </tr>

                  {/* Tour Planning */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 pr-4 text-gray-700 font-medium sticky left-0 bg-white">
                      Tour Planning
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <X className="inline-block text-red-400" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Avancé</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">+ Optimisation IA</div>
                    </td>
                  </tr>

                  {/* Chat */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 pr-4 text-gray-700 font-medium sticky left-0 bg-white">
                      Chat interne
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Équipe</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">+ Visio</div>
                    </td>
                  </tr>

                  {/* Utilisateurs */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50 bg-blue-50/30">
                    <td className="py-4 pr-4 text-gray-700 font-medium sticky left-0 bg-blue-50/30">
                      👥 Utilisateurs
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-900">
                      Illimité (14j)
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-900">
                      Jusqu'à 2
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-900">
                      Jusqu'à 10
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-900">
                      Illimités
                    </td>
                  </tr>

                  {/* Support */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50 bg-blue-50/30">
                    <td className="py-4 pr-4 text-gray-700 font-medium sticky left-0 bg-blue-50/30">
                      💬 Support
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-900">
                      Email
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-900">
                      Email prioritaire
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-900">
                      Prioritaire 24/7
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-900">
                      Dédié + gestionnaire
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Légende */}
            <div className="mt-6 flex flex-wrap gap-6 justify-center text-sm">
              <div className="flex items-center gap-2">
                <Check className="text-green-600" size={18} strokeWidth={3} />
                <span className="text-gray-600">Inclus</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-orange-500" size={18} strokeWidth={3} />
                <span className="text-gray-600">Version limitée</span>
              </div>
              <div className="flex items-center gap-2">
                <X className="text-red-400" size={18} strokeWidth={3} />
                <span className="text-gray-600">Non inclus</span>
              </div>
            </div>
          </div>
        )}

        {/* Info complémentaire */}
        <div className="text-center space-y-4">
          <p className="text-gray-600 flex flex-wrap justify-center gap-4">
            <span className="inline-flex items-center gap-2">
              <Check className="text-green-600" size={18} /> Paiement sécurisé
            </span>
            <span className="inline-flex items-center gap-2">
              <Check className="text-green-600" size={18} /> Sans engagement
            </span>
            <span className="inline-flex items-center gap-2">
              <Check className="text-green-600" size={18} /> Résiliation à tout moment
            </span>
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