// src/vitrine/components/Pricing.tsx - VERSION BETA SIMPLIFIÉE
import { Check, Rocket, Sparkles, Users, Clock, Gift, Shield, Calendar } from "lucide-react";

export default function Pricing() {
  const betaSpots = {
    total: 15,
    remaining: 15, // ← Mets à jour selon les inscriptions réelles
  };

  const timeline = {
    freeStart: "Décembre 2025",
    freeEnd: "Février 2026",
    paidStart: "Mars 2026",
    freeMonths: 3,
  };

  const features = [
    { name: "Dashboard complet", included: true },
    { name: "Planning collaboratif", included: true },
    { name: "Gestion de stock temps réel", included: true },
    { name: "Chargement 3D AUTOMATIQUE", included: true, highlight: true },
    { name: "Vue Synoptique 3D entrepôt", included: true },
    { name: "Tournées optimisées + GPS", included: true },
    { name: "Chat d'équipe intégré", included: true },
    { name: "MasterData illimité", included: true },
    { name: "Jusqu'à 10 utilisateurs", included: true },
    { name: "Support prioritaire", included: true },
  ];

  const benefits = [
    { icon: Gift, text: "3 mois 100% gratuits (déc-fév)" },
    { icon: Users, text: "Influence directe sur la roadmap" },
    { icon: Shield, text: "Puis 249€/mois à vie (au lieu de 349€)" },
    { icon: Clock, text: "Support dédié pendant toute la beta" },
  ];

  return (
    <section 
      id="pricing" 
      className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white via-blue-50/30 to-white"
      aria-labelledby="pricing-title"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-2 rounded-full mb-4 animate-pulse">
            <Sparkles size={18} className="text-green-600" />
            <span className="text-sm font-bold text-green-700">
              BETA PRIVÉE • Décembre 2025 - Février 2026
            </span>
          </div>

          <h2 
            id="pricing-title"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4"
          >
            Rejoignez les{" "}
            <span className="text-[#2792B0]">{betaSpots.total} premiers</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Tarif exclusif garanti à vie pour les early adopters.
            <br />
            <span className="font-semibold text-gray-900">
              {betaSpots.remaining} place{betaSpots.remaining > 1 ? 's' : ''} restante{betaSpots.remaining > 1 ? 's' : ''}
            </span>
          </p>
        </div>

        {/* Carte unique */}
        <div className="relative">
          {/* Badge urgence */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg flex items-center gap-2">
              <Clock size={16} />
              Plus que {betaSpots.remaining} places !
            </div>
          </div>

          <article className="bg-gradient-to-b from-[#2792B0] to-[#1a6b80] text-white rounded-3xl shadow-2xl p-8 sm:p-10 border-4 border-[#2792B0] ring-4 ring-blue-100">
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Rocket className="text-white" size={28} />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold">Offre Beta</h3>
                <p className="text-white/80 text-sm">Accès complet • Toutes fonctionnalités</p>
              </div>
            </div>

            {/* Timeline : Gratuit → Payant */}
            <div className="bg-white/10 rounded-2xl p-6 mb-8">
              {/* Étape 1 : GRATUIT */}
              <div className="flex items-center justify-center gap-4 mb-4 pb-4 border-b border-white/20">
                <div className="w-12 h-12 rounded-full bg-green-400 flex items-center justify-center">
                  <Gift className="text-green-900" size={24} />
                </div>
                <div className="text-left">
                  <div className="text-2xl sm:text-3xl font-extrabold text-green-300">GRATUIT</div>
                  <div className="text-white/70 text-sm">
                    {timeline.freeStart} → {timeline.freeEnd} ({timeline.freeMonths} mois)
                  </div>
                </div>
              </div>
              
              {/* Étape 2 : Puis 249€ */}
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-white/60 text-sm mb-1">Puis à partir de {timeline.paidStart}</div>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-4xl sm:text-5xl font-extrabold text-green-300">249€</span>
                    <span className="text-lg text-white/80">/mois</span>
                    <div className="text-left">
                      <div className="text-base line-through text-white/50">349€</div>
                      <div className="bg-green-400 text-green-900 text-xs font-bold px-2 py-1 rounded">
                        -57% À VIE
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-center text-green-200 font-semibold mt-4">
                🎁 {timeline.freeMonths} mois gratuits + tarif garanti À VIE
              </p>
            </div>

            {/* Fonctionnalités */}
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-wide mb-4 text-white/70">
                Tout est inclus
              </p>
              <ul className="grid sm:grid-cols-2 gap-3">
                {features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <Check 
                      className={`flex-shrink-0 w-5 h-5 ${feature.highlight ? 'text-green-300' : 'text-green-300'}`}
                      strokeWidth={3}
                    />
                    <span className={feature.highlight ? 'font-bold text-green-200' : 'text-white/90'}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Avantages Beta */}
            <div className="bg-white/10 rounded-xl p-5 mb-8">
              <p className="text-sm font-bold mb-3 text-green-200">
                ✨ Avantages exclusifs Beta Testeur
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {benefits.map((benefit, idx) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm text-white/90">
                      <Icon size={16} className="text-green-300 flex-shrink-0" />
                      <span>{benefit.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <a
              href="#DevisForm"
              className="block w-full text-center px-8 py-4 bg-white text-[#2792B0] rounded-xl font-bold text-lg hover:bg-gray-100 transition-all hover:scale-105 shadow-xl"
            >
              Rejoindre la bêta gratuite
            </a>

            {/* Sous le CTA */}
            <p className="text-center text-white/60 text-sm mt-4">
              Sans carte bancaire • Sans engagement • Annulation possible à tout moment
            </p>
          </article>
        </div>

        {/* Note post-beta */}
        <div className="mt-10 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-4 bg-gray-100 px-6 py-4 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-500" />
              <span className="text-gray-600 text-sm">
                <span className="font-semibold">Déc 2025 → Fév 2026 :</span> Beta gratuite
              </span>
            </div>
            <span className="hidden sm:block text-gray-400">→</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">
                <span className="font-semibold">Mars 2026 :</span> 249€/mois à vie
              </span>
            </div>
          </div>
          <p className="text-gray-500 text-sm mt-3">
            Les nouveaux clients après la beta paieront 349€/mois.
          </p>
        </div>

        {/* Garanties */}
        <div className="mt-12 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Check className="text-green-600" size={20} strokeWidth={3} />
              <span className="font-medium">Sans carte bancaire pour s'inscrire</span>
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
      </div>
    </section>
  );
}