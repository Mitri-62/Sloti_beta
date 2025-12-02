import { DollarSign, Users, Headphones, Star, Check, Calendar, Zap, Shield } from "lucide-react";

export default function BetaBenefits() {
  return (
    <section id="beta-benefits" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-full mb-4">
            <Star size={18} className="text-orange-600" fill="currentColor" />
            <span className="text-sm font-semibold text-orange-600">
              Offre limitée aux 15 premiers
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Pourquoi rejoindre la{" "}
            <span className="text-orange-500">bêta privée</span> ?
          </h2>
          
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Soyez parmi les premiers à façonner l'outil avec nous et bénéficiez d'avantages exclusifs
          </p>
        </div>

        {/* Grille des avantages */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {/* Avantage 1 : Prix gelé */}
          <div className="group relative bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border-2 border-orange-200 hover:border-orange-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
              Économisez 2 400€/an
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <DollarSign className="text-white" size={28} strokeWidth={2.5} />
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Prix gelé à vie
                </h3>
                <p className="text-gray-700 text-lg mb-4">
                  <span className="text-3xl font-bold text-orange-600">GRATUIT pendant 3 mois</span>
                  {" "}puis 149€/mois au lieu{" "}
                  <span className="line-through text-gray-500">349€/mois</span>
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Vous conservez ce tarif préférentiel <strong>pour toujours</strong>, même après le lancement public. Une économie de <strong>200€/mois à vie</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Avantage 2 : Influence produit */}
          <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Users className="text-white" size={28} strokeWidth={2.5} />
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Influencez le produit
                </h3>
                <p className="text-gray-700 mb-3">
                  Vos retours façonnent directement les prochaines fonctionnalités
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-600">
                    <Check size={18} className="text-blue-600 flex-shrink-0" strokeWidth={3} />
                    <span>Accès direct au fondateur</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <Check size={18} className="text-blue-600 flex-shrink-0" strokeWidth={3} />
                    <span>Votes sur les nouvelles features</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <Check size={18} className="text-blue-600 flex-shrink-0" strokeWidth={3} />
                    <span>Tests en avant-première</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Avantage 3 : Support VIP */}
          <div className="group bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border-2 border-green-200 hover:border-green-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Headphones className="text-white" size={28} strokeWidth={2.5} />
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Support VIP
                </h3>
                <p className="text-gray-700 mb-3">
                  Ligne directe avec le fondateur pendant 6 mois
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-600">
                    <Check size={18} className="text-green-600 flex-shrink-0" strokeWidth={3} />
                    <span>Réponse sous 2h (jour ouvré)</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <Check size={18} className="text-green-600 flex-shrink-0" strokeWidth={3} />
                    <span>Visio de formation personnalisée</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <Check size={18} className="text-green-600 flex-shrink-0" strokeWidth={3} />
                    <span>Configuration sur-mesure</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Avantage 4 : Statut pionnier */}
          <div className="group bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-8 border-2 border-purple-200 hover:border-purple-400 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Star className="text-white" size={28} strokeWidth={2.5} fill="currentColor" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Statut de pionnier
                </h3>
                <p className="text-gray-700 mb-3">
                  Reconnaissance officielle de votre rôle dans notre succès
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-gray-600">
                    <Check size={18} className="text-purple-600 flex-shrink-0" strokeWidth={3} />
                    <span>Logo sur "Ils nous font confiance"</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <Check size={18} className="text-purple-600 flex-shrink-0" strokeWidth={3} />
                    <span>Badge "Early Adopter" dans l'app</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <Check size={18} className="text-purple-600 flex-shrink-0" strokeWidth={3} />
                    <span>Témoignage mis en avant</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline de lancement */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 sm:p-10 border-2 border-gray-200">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
            Roadmap de lancement
          </h3>
          
          <div className="space-y-6">
            {/* Phase 1 : Bêta privée (ACTIVE) */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                  <Zap className="text-white" size={20} />
                </div>
              </div>
              <div className="flex-1 bg-white rounded-xl p-5 border-2 border-green-500 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-lg text-gray-900">Décembre 2025 - Février 2026</h4>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                    EN COURS
                  </span>
                </div>
                <p className="text-gray-600">
                  <strong>Bêta privée (15 entreprises)</strong> - Collecte des retours terrain, optimisations et ajustements avant le lancement public
                </p>
              </div>
            </div>

            {/* Phase 2 : Lancement public */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Calendar className="text-white" size={20} />
                </div>
              </div>
              <div className="flex-1 bg-white rounded-xl p-5 border-2 border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-lg text-gray-900">Mars 2026</h4>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                    LANCEMENT
                  </span>
                </div>
                <p className="text-gray-600">
                  <strong>Ouverture au public</strong> - Version stable, support complet, tarifs standards (349€/mois pour le plan Pro)
                </p>
              </div>
            </div>

            {/* Phase 3 : Intégrations */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <Shield className="text-white" size={20} />
                </div>
              </div>
              <div className="flex-1 bg-white rounded-xl p-5 border-2 border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-lg text-gray-900">2026</h4>
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                    PROCHAINEMENT
                  </span>
                </div>
                <p className="text-gray-600">
                  <strong>Intégrations ERP</strong> - Connexions SAP, Sage, Cegid, APIs personnalisées
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Final */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl p-8 sm:p-10 shadow-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <Star size={18} fill="currentColor" />
              <span className="text-sm font-bold">Places limitées</span>
            </div>
            
            <h3 className="text-3xl sm:text-4xl font-bold mb-4">
              Prêt à révolutionner votre logistique ?
            </h3>
            
            <p className="text-lg mb-6 text-white/90 max-w-2xl mx-auto">
              Il reste <strong className="text-2xl">15 places</strong> sur les 15 disponibles pour la bêta privée
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#DevisForm"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all hover:scale-105 shadow-xl"
              >
                <Zap size={24} />
                Rejoindre la bêta maintenant
              </a>
              
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-orange-600 rounded-xl font-bold text-lg transition-all hover:scale-105"
              >
                Voir les fonctionnalités
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}