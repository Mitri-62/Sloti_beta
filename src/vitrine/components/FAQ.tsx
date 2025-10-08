// src/vitrine/components/FAQ.tsx
import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Sloti est-il adapté à mon entreprise ?",
    answer:
      "Oui ! Sloti s'adresse aux PME comme aux grandes entreprises qui souhaitent simplifier la gestion de leurs flux logistiques. Notre solution s'adapte à vos besoins spécifiques.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer:
      "Toutes vos données sont stockées et sécurisées avec Supabase, chiffrées en transit et au repos, conformément aux meilleures pratiques du marché et au RGPD.",
  },
  {
    question: "Puis-je inviter plusieurs utilisateurs ?",
    answer:
      "Bien sûr ! Selon votre plan, vous pouvez inviter vos collègues, vos transporteurs ou vos fournisseurs directement dans la plateforme pour une collaboration optimale.",
  },
  {
    question: "Sloti propose-t-il une période d'essai ?",
    answer:
      "Oui, vous bénéficiez de 14 jours d'essai gratuit sans carte bancaire requise. Testez toutes les fonctionnalités avant de vous engager.",
  },
  {
    question: "Puis-je changer de plan à tout moment ?",
    answer:
      "Absolument ! Vous pouvez passer à un plan supérieur ou inférieur à tout moment. Les ajustements de facturation se font automatiquement et de manière proportionnelle.",
  },
  {
    question: "Quel support est disponible ?",
    answer:
      "Nous offrons un support par email pour tous les plans, un support prioritaire pour les plans Starter et Pro, et un support 24/7 pour le plan Enterprise avec un gestionnaire de compte dédié.",
  },
  {
    question: "Sloti fonctionne-t-il sur mobile ?",
    answer:
      "Oui, Sloti est entièrement responsive et fonctionne parfaitement sur smartphones et tablettes. Vous pouvez gérer vos flux logistiques où que vous soyez.",
  },
  {
    question: "Y a-t-il des frais cachés ?",
    answer:
      "Non, aucun frais caché. Le prix affiché est le prix que vous payez. Pas de frais d'installation, pas de coûts supplémentaires pour les mises à jour.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleKeyPress = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleFAQ(index);
    }
  };

  return (
    <section 
      id="faq" 
      className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-white to-gray-50"
      aria-labelledby="faq-title"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* En-tête */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-6">
            <HelpCircle size={32} strokeWidth={2} />
          </div>
          <h2 
            id="faq-title"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4"
          >
            Questions <span className="text-[#2792B0]">fréquentes</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Vous avez des questions ? Nous avons les réponses.
          </p>
        </div>

        {/* Liste FAQ */}
        <div className="space-y-4" role="list">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
              role="listitem"
            >
              <button
                onClick={() => toggleFAQ(index)}
                onKeyDown={(e) => handleKeyPress(e, index)}
                className="w-full text-left p-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${index}`}
              >
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`flex-shrink-0 w-6 h-6 text-gray-500 transition-transform duration-300 ${
                      openIndex === index ? "rotate-180 text-[#2792B0]" : ""
                    }`}
                    aria-hidden="true"
                  />
                </div>
              </button>
              
              <div
                id={`faq-answer-${index}`}
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
                aria-hidden={openIndex !== index}
              >
                <div className="px-6 pb-6">
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed mt-4">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-6">
            Vous avez d'autres questions ?
          </p>
          <a
            href="#DevisForm"
            className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            Contactez-nous
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