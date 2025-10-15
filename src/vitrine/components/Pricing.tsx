// src/vitrine/components/Pricing.tsx - VERSION FINALE 149€
import { useState } from "react";
import { Check, X, Star, Zap, Info, Shield, TrendingUp, Rocket, Sparkles } from "lucide-react";

// 👇 AJOUTE CE TYPE ICI
interface Feature {
  name: string;
  included: boolean;
  detail?: string;
  highlight?: boolean;
}

interface PlanLimit {
  name: string;
  value: string;
}

interface EarlyBird {
  show: boolean;
  originalPrice: number;
  discountedPrice: number;
  label: string;
  description: string;
  remaining: string;
}

interface Plan {
  name: string;
  price: { monthly: number; yearly: number };
  period: string;
  description: string;
  tagline: string;
  features: Feature[];
  limits: PlanLimit[];
  button: string;
  highlight: boolean;
  popular: boolean;
  color: string;
  icon: any;
  badge?: string;
  earlyBird?: EarlyBird;
  note?: string;
}


export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [showComparison, setShowComparison] = useState(false);

  const plans: Plan[] = [
    {
      name: "Essai gratuit",
      price: { monthly: 0, yearly: 0 },
      period: "14 jours",
      description: "Toutes les fonctionnalités",
      tagline: "Testez sans carte bancaire",
      features: [
        { name: "Dashboard intuitif", included: true },
        { name: "Planning collaboratif", included: true },
        { name: "Gestion de stock", included: true },
        { name: "Chargement 3D auto", included: true },
        { name: "Tournées intelligentes", included: true },
        { name: "Chat intégré", included: true },
      ],
      limits: [
        { name: "Utilisateurs", value: "Illimité pendant 14j" },
        { name: "Support", value: "Email" },
      ],
      button: "Démarrer l'essai gratuit",
      highlight: false,
      popular: false,
      color: "gray",
      icon: Shield,
    },
    {
      name: "Starter",
      price: { monthly: 149, yearly: 124 },
      period: "par mois",
      description: "Pour petites équipes",
      tagline: "Petites équipes • 1-2 sites",
      features: [
        { name: "Dashboard complet", included: true },
        { name: "Planning collaboratif", included: true },
        { name: "Stocks temps réel", included: true },
        { name: "Chargement 3D manuel", included: true, detail: "Optimisation manuelle" },
        { name: "Vue Synoptique 3D", included: false },
        { name: "Tournées optimisées", included: false },
      ],
      limits: [
        { name: "Utilisateurs", value: "Jusqu'à 2" },
        { name: "Support", value: "Email prioritaire (48h)" },
      ],
      button: "Choisir Starter",
      highlight: false,
      popular: false,
      color: "blue",
      icon: TrendingUp,
    },
    {
      name: "Pro",
      price: { monthly: 349, yearly: 290 },
      period: "par mois",
      description: "Le meilleur rapport qualité/prix",
      tagline: "PME/ETI • Toutes fonctionnalités",
      features: [
        { name: "Tout de Starter +", included: true },
        { name: "Chargement 3D AUTOMATIQUE", included: true, highlight: true },
        { name: "Vue Synoptique 3D", included: true },
        { name: "Tournées optimisées", included: true },
        { name: "MasterData illimité", included: true },
        { name: "Chat d'équipe avancé", included: true },
      ],
      limits: [
        { name: "Utilisateurs", value: "Jusqu'à 10" },
        { name: "Support", value: "Prioritaire 24/7" },
      ],
      button: "Commencer avec Pro",
      highlight: true,
      popular: true,
      color: "purple",
      icon: Rocket,
      badge: "95% des clients choisissent ce plan",
      earlyBird: {
        show: true,
        originalPrice: 349,
        discountedPrice: 149,
        label: "OFFRE EARLY ADOPTER",
        description: "149€/mois À VIE pour les 15 premiers",
        remaining: "12 places restantes"
      }
    },
    {
      name: "Enterprise",
      price: { monthly: 799, yearly: 665 },
      period: "par mois",
      description: "Performance maximale",
      tagline: "Grandes entreprises • Multi-sites",
      features: [
        { name: "Tout de Pro +", included: true },
        { name: "Dashboard personnalisable", included: true },
        { name: "Planning multi-sites", included: true },
        { name: "Optimisation IA avancée", included: true },
        { name: "Intégrations avancées*", included: true, detail: "Webhooks, Zapier, Export auto" },
        { name: "Chat + Visioconférence", included: true },
      ],
      limits: [
        { name: "Utilisateurs", value: "Illimités" },
        { name: "Support", value: "Dédié 24/7 + Account Manager" },
      ],
      button: "Demander une démo",
      highlight: false,
      popular: false,
      color: "indigo",
      icon: Zap,
      note: "* API REST complète disponible Q2 2026"
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
      className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white via-blue-50/30 to-white"
      aria-labelledby="pricing-title"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full mb-4">
            <Star size={18} className="text-blue-600" fill="currentColor" />
            <span className="text-sm font-semibold text-blue-600">
              Plans simples et transparents
            </span>
          </div>

          <h2 
            id="pricing-title"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4"
          >
            Trouvez votre{" "}
            <span className="text-[#2792B0]">plan idéal</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Commencez gratuitement, évoluez à votre rythme. 
            Changez ou annulez à tout moment, sans engagement.
          </p>

          {/* Toggle mensuel/annuel */}
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1 mb-6 shadow-inner">
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
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                -17%
              </span>
            </button>
          </div>

          {/* Bouton comparateur - SPACING AUGMENTÉ */}
          <div className="mt-6 mb-10">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="text-[#2792B0] hover:text-[#207A94] font-medium underline inline-flex items-center gap-2 transition-colors"
            >
              <Info size={18} />
              {showComparison ? "Masquer" : "Afficher"} le comparateur détaillé
            </button>
          </div>
        </div>

        {/* Grille de prix - SPACING AUGMENTÉ EN HAUT */}
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4 mb-12 pt-6">
          {plans.map((plan, i) => {
            const price = getPrice(plan);
            const savings = getSavings(plan);
            const PlanIcon = plan.icon;
            const showEarlyBird = plan.earlyBird?.show && billingCycle === "monthly";

            return (
              <article
                key={i}
                className={`relative rounded-2xl shadow-lg p-6 sm:p-8 flex flex-col transition-all duration-300 ${
                  plan.highlight
                    ? "bg-gradient-to-b from-[#2792B0] to-[#207A94] text-white scale-105 lg:scale-110 shadow-2xl border-2 border-[#2792B0] ring-4 ring-blue-100"
                    : "bg-white text-gray-800 hover:shadow-xl hover:-translate-y-1 border border-gray-200"
                }`}
              >
                {/* Badge populaire - POSITION AJUSTÉE */}
                {plan.popular && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)]">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 text-xs font-bold px-4 py-2 rounded-full shadow-lg text-center flex items-center justify-center gap-1">
                      <Star size={14} fill="currentColor" />
                      {plan.badge}
                    </div>
                  </div>
                )}

                {/* Badge Early Bird */}
                {showEarlyBird && plan.earlyBird && (
                  <div className="absolute -top-3 -right-3 z-10">
                    <div className="relative">
                      <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl transform rotate-3 animate-pulse">
                        <div className="flex items-center gap-1">
                          <Sparkles size={12} fill="currentColor" />
                          <span>{plan.earlyBird.label}</span>
                        </div>
                        <div className="text-[10px] font-normal mt-0.5">
                          {plan.earlyBird.remaining}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Icône du plan */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  plan.highlight ? "bg-white/20" : "bg-blue-100"
                }`}>
                  <PlanIcon className={plan.highlight ? "text-white" : "text-blue-600"} size={24} />
                </div>

                {/* Nom du plan */}
                <h3
                  className={`text-xl sm:text-2xl font-semibold mb-2 ${
                    plan.highlight ? "text-white" : "text-gray-900"
                  }`}
                >
                  {plan.name}
                </h3>

                {/* Tagline */}
                <p className={`text-xs font-medium mb-1 ${
                  plan.highlight ? "text-white/80" : "text-gray-500"
                }`}>
                  {plan.tagline}
                </p>

                {/* Description */}
                <p className={`text-sm mb-6 ${plan.highlight ? "text-white/90" : "text-gray-600"}`}>
                  {plan.description}
                </p>

                {/* Prix */}
                <div className="mb-6">
                  {showEarlyBird && plan.earlyBird ? (
                    <>
                      {/* Prix Early Bird */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl sm:text-5xl font-bold text-green-300">
                            {plan.earlyBird.discountedPrice}€
                          </span>
                          <span className="text-lg text-white/80">/ mois</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm line-through text-white/60">
                            {plan.earlyBird.originalPrice}€
                          </span>
                          <span className="text-xs font-bold text-green-300">
                            -57%
                          </span>
                        </div>
                      </div>
                      <div className="bg-green-400/20 text-green-100 px-3 py-2 rounded-lg text-xs font-semibold">
                        🎁 {plan.earlyBird.description}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Prix normal */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl sm:text-5xl font-bold">
                          {price}€
                        </span>
                        <span className={`text-lg ${plan.highlight ? "text-white/80" : "text-gray-600"}`}>
                          {plan.name === "Essai gratuit" ? "" : `/ ${plan.period}`}
                        </span>
                      </div>
                      {billingCycle === "yearly" && savings > 0 && (
                        <div className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                          plan.highlight ? "bg-green-400/20 text-green-100" : "bg-green-100 text-green-700"
                        }`}>
                          💰 Économisez {savings}€/an
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Fonctionnalités */}
                <div className="flex-1 mb-6">
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${
                    plan.highlight ? "text-white/80" : "text-gray-500"
                  }`}>
                    Fonctionnalités incluses
                  </p>
                  <ul className="space-y-3 text-sm">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className={`flex items-start gap-3 ${
                          plan.highlight ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {feature.included ? (
                          <Check 
                            className={`flex-shrink-0 w-5 h-5 ${
                              plan.highlight ? "text-green-300" : "text-green-600"
                            } ${feature.highlight ? 'animate-pulse' : ''}`}
                            strokeWidth={3}
                          />
                        ) : (
                          <X 
                            className={`flex-shrink-0 w-5 h-5 ${
                              plan.highlight ? "text-red-300" : "text-red-400"
                            }`}
                            strokeWidth={3}
                          />
                        )}
                        <div className="flex-1">
                          <span className={`leading-tight ${feature.highlight ? 'font-bold' : ''}`}>
                            {feature.name}
                          </span>
                          {feature.detail && (
                            <div className={`text-xs mt-1 ${
                              plan.highlight ? "text-white/70" : "text-gray-500"
                            }`}>
                              {feature.detail}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Note spéciale (pour Enterprise) */}
                {plan.note && (
                  <div className={`mb-4 text-xs italic ${
                    plan.highlight ? "text-white/70" : "text-gray-500"
                  }`}>
                    {plan.note}
                  </div>
                )}

                {/* Limites (Utilisateurs & Support) */}
                <div className={`mb-6 space-y-2 text-sm border-t pt-4 ${
                  plan.highlight ? "border-white/20" : "border-gray-200"
                }`}>
                  {plan.limits.map((limit, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className={`font-medium ${plan.highlight ? "text-white/90" : "text-gray-600"}`}>
                        {limit.name === "Utilisateurs" ? "👥" : "💬"} {limit.name}
                      </span>
                      <span className={`text-xs font-semibold ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                        {limit.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bouton CTA */}
                <button
                  className={`w-full px-6 py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-all duration-300 focus:outline-none focus:ring-4 ${
                    plan.highlight
                      ? "bg-white text-[#2792B0] hover:bg-gray-100 focus:ring-white/50 shadow-lg hover:scale-105"
                      : "bg-[#2792B0] text-white hover:bg-[#207A94] focus:ring-blue-300 hover:shadow-lg hover:scale-105"
                  }`}
                  aria-label={`${plan.button} - Plan ${plan.name}`}
                >
                  {plan.button}
                </button>
              </article>
            );
          })}
        </div>

        {/* Section Intégrations sur-mesure */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 mb-12 border border-indigo-100">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-100 px-4 py-2 rounded-full mb-4">
              <Zap size={18} className="text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-600">
                Intégrations sur-mesure
              </span>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Besoin d'une connexion avec votre ERP/WMS ?
            </h3>
            
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Connectez Sloti à SAP, Oracle, Sage, Cegid ou tout système propriétaire.
              <br />
              Développement personnalisé avec maintenance incluse.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="font-bold text-indigo-600 text-lg mb-1">Connecteur ERP</div>
                <div className="text-sm text-gray-600">3 000 - 8 000€</div>
                <div className="text-xs text-gray-500 mt-1">+ 150-300€/mois maintenance</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="font-bold text-indigo-600 text-lg mb-1">E-commerce</div>
                <div className="text-sm text-gray-600">1 500 - 3 000€</div>
                <div className="text-xs text-gray-500 mt-1">+ 100€/mois maintenance</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="font-bold text-indigo-600 text-lg mb-1">API custom</div>
                <div className="text-sm text-gray-600">À partir de 5 000€</div>
                <div className="text-xs text-gray-500 mt-1">Devis sur-mesure</div>
              </div>
            </div>

            <a 
              href="#DevisForm" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all hover:scale-105 shadow-lg"
            >
              Demander un devis d'intégration
              <Zap size={18} />
            </a>
          </div>
        </div>

        {/* Comparateur détaillé */}
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

                  {/* Chargement 3D - LIGNE IMPORTANTE */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50 bg-blue-50/30">
                    <td className="py-4 pr-4 text-gray-700 font-bold sticky left-0 bg-blue-50/30">
                      ⚡ Chargement 3D
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs font-bold text-gray-900 mt-1">Automatique</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-orange-500" size={20} strokeWidth={3} />
                      <div className="text-xs font-bold text-gray-900 mt-1">Manuel</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={22} strokeWidth={3} />
                      <div className="text-xs font-bold text-green-600 mt-1">AUTOMATIQUE</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs font-bold text-gray-900 mt-1">Auto + IA</div>
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

                  {/* Tournées */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 pr-4 text-gray-700 font-medium sticky left-0 bg-white">
                      Tournées optimisées
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <X className="inline-block text-red-400" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Avancées</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">+ IA</div>
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

                  {/* MasterData */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 pr-4 text-gray-700 font-medium sticky left-0 bg-white">
                      MasterData
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Illimité</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Illimité</div>
                    </td>
                  </tr>

                  {/* Intégrations - LIGNE IMPORTANTE */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50 bg-purple-50/30">
                    <td className="py-4 pr-4 text-gray-700 font-bold sticky left-0 bg-purple-50/30">
                      🔗 Intégrations
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Excel/CSV</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Excel/CSV</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs text-gray-600 mt-1">Excel/CSV</div>
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      <Check className="inline-block text-green-600" size={20} strokeWidth={3} />
                      <div className="text-xs font-bold text-gray-900 mt-1">Webhooks + Zapier*</div>
                    </td>
                  </tr>

                  {/* Utilisateurs */}
                  <tr className="border-b border-gray-100 hover:bg-gray-50 bg-blue-50/30">
                    <td className="py-4 pr-4 text-gray-700 font-bold sticky left-0 bg-blue-50/30">
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
                    <td className="py-4 pr-4 text-gray-700 font-bold sticky left-0 bg-blue-50/30">
                      💬 Support
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-900 text-sm">
                      Email
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-900 text-sm">
                      Email prioritaire
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-900 text-sm">
                      Prioritaire 24/7
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-gray-900 text-sm">
                      Dédié + Manager
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Note API */}
            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <span className="font-bold">* API REST complète :</span> Documentation Swagger disponible Q2 2026. 
                En attendant : Webhooks temps réel + Zapier (5000+ apps) + Intégrations sur-mesure (devis personnalisé).
              </p>
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

        {/* Garanties et CTA final */}
        <div className="mt-12 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Toutes nos garanties
            </h3>
            <div className="flex flex-wrap justify-center gap-6 text-sm sm:text-base">
              <div className="flex items-center gap-2">
                <Check className="text-green-600" size={20} strokeWidth={3} />
                <span className="font-medium">Essai gratuit 14 jours</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-green-600" size={20} strokeWidth={3} />
                <span className="font-medium">Sans carte bancaire</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-green-600" size={20} strokeWidth={3} />
                <span className="font-medium">Sans engagement</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-green-600" size={20} strokeWidth={3} />
                <span className="font-medium">Annulation en 1 clic</span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Une question sur nos tarifs ou besoin d'un devis personnalisé ?
            </p>
            <a 
              href="#DevisForm" 
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#2792B0] text-white rounded-lg font-semibold text-lg hover:bg-[#207A94] transition-all hover:scale-105 shadow-lg"
            >
              Contactez notre équipe
              <Zap size={20} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}