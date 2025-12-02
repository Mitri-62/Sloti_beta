// src/vitrine/pages/Confidentialite.tsx
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Confidentialite() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-[#2792B0] hover:underline mb-8"
        >
          <ArrowLeft size={20} />
          Retour à l'accueil
        </Link>

        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Politique de confidentialité</h1>
          
          <div className="space-y-8 text-gray-700">
            
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
              <p className="leading-relaxed">
                La protection de vos données personnelles est une priorité pour Sloti. 
                Cette politique explique comment nous collectons, utilisons et protégeons 
                vos informations conformément au Règlement Général sur la Protection des 
                Données (RGPD).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Responsable du traitement</h2>
              <p className="leading-relaxed">
                <strong>Dimitri Deremarque</strong><br />
                Email : <a href="mailto:contact@getsloti.fr" className="text-[#2792B0] hover:underline">contact@getsloti.fr</a><br />
                Adresse : Arras, 62000, France
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Données collectées</h2>
              <p className="leading-relaxed mb-4">
                Nous collectons les données suivantes via notre formulaire de contact :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Nom complet</strong> - pour vous identifier</li>
                <li><strong>Email professionnel</strong> - pour vous contacter</li>
                <li><strong>Entreprise</strong> (optionnel) - pour personnaliser notre offre</li>
                <li><strong>Téléphone</strong> (optionnel) - pour vous rappeler si nécessaire</li>
                <li><strong>Message</strong> - pour comprendre vos besoins</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Finalités du traitement</h2>
              <p className="leading-relaxed mb-4">
                Vos données sont utilisées pour :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Répondre à vos demandes d'information</li>
                <li>Vous donner accès à la version bêta de Sloti</li>
                <li>Vous envoyer des informations sur nos services (avec votre consentement)</li>
                <li>Améliorer notre service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Base légale</h2>
              <p className="leading-relaxed">
                Le traitement de vos données repose sur :<br />
                • Votre <strong>consentement</strong> lors de la soumission du formulaire<br />
                • Notre <strong>intérêt légitime</strong> à développer notre activité commerciale<br />
                • L'<strong>exécution d'un contrat</strong> lorsque vous utilisez nos services
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Stockage et sécurité</h2>
              <p className="leading-relaxed">
                Vos données sont stockées sur des serveurs sécurisés <strong>Supabase</strong>, 
                situés dans l'Union Européenne (Allemagne). Nous utilisons le chiffrement 
                SSL/TLS pour protéger les transferts de données et appliquons des mesures 
                de sécurité techniques et organisationnelles appropriées.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Durée de conservation</h2>
              <p className="leading-relaxed">
                Vos données sont conservées pendant :<br />
                • <strong>3 ans</strong> à compter de votre dernière interaction (prospects)<br />
                • <strong>Durée du contrat + 5 ans</strong> (clients)<br />
                • Vous pouvez demander la suppression à tout moment
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Vos droits</h2>
              <p className="leading-relaxed mb-4">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Droit d'accès</strong> - obtenir une copie de vos données</li>
                <li><strong>Droit de rectification</strong> - corriger vos données</li>
                <li><strong>Droit à l'effacement</strong> - supprimer vos données</li>
                <li><strong>Droit à la portabilité</strong> - récupérer vos données</li>
                <li><strong>Droit d'opposition</strong> - vous opposer au traitement</li>
                <li><strong>Droit de retrait du consentement</strong> - à tout moment</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Pour exercer ces droits, contactez-nous à : 
                <a href="mailto:contact@getsloti.fr" className="text-[#2792B0] hover:underline ml-1">contact@getsloti.fr</a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Cookies</h2>
              <p className="leading-relaxed">
                Ce site utilise uniquement des cookies techniques essentiels au fonctionnement 
                (authentification, préférences). Nous n'utilisons pas de cookies publicitaires 
                ou de tracking tiers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Partage des données</h2>
              <p className="leading-relaxed">
                Vos données ne sont <strong>jamais vendues</strong> à des tiers. Elles peuvent 
                être partagées uniquement avec nos sous-traitants techniques (Supabase, Resend) 
                dans le cadre strict de la fourniture de nos services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Réclamation</h2>
              <p className="leading-relaxed">
                Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire 
                une réclamation auprès de la CNIL :<br />
                <a href="https://www.cnil.fr" className="text-[#2792B0] hover:underline" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
              </p>
            </section>

          </div>

          <p className="text-sm text-gray-500 mt-10 pt-6 border-t">
            Dernière mise à jour : Décembre 2025
          </p>
        </div>
      </div>
    </div>
  );
}