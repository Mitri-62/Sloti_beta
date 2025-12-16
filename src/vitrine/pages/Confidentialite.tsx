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
                <strong>Sloti</strong><br />
                Dimitri Deremarque<br />
                Email : <a href="mailto:contact@getsloti.fr" className="text-[#2792B0] hover:underline">contact@getsloti.fr</a><br />
                Adresse : Arras, 62000, France
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Données collectées</h2>
              
              <p className="leading-relaxed mb-4">
                <strong>3.1 Via le site vitrine (formulaires)</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-6">
                <li><strong>Nom complet</strong> - pour vous identifier</li>
                <li><strong>Email professionnel</strong> - pour vous contacter</li>
                <li><strong>Entreprise</strong> (optionnel) - pour personnaliser notre offre</li>
                <li><strong>Téléphone</strong> (optionnel) - pour vous rappeler si nécessaire</li>
                <li><strong>Message</strong> - pour comprendre vos besoins</li>
              </ul>

              <p className="leading-relaxed mb-4">
                <strong>3.2 Via l'application Sloti (utilisateurs)</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-6">
                <li><strong>Identité</strong> - nom, email, téléphone des utilisateurs et chauffeurs</li>
                <li><strong>Données d'entreprise</strong> - nom, adresse, informations de l'entreprise cliente</li>
                <li><strong>Données opérationnelles</strong> - tournées, livraisons, stocks, commandes, réservations</li>
                <li><strong>Géolocalisation</strong> - position GPS des chauffeurs (uniquement pendant les tournées, avec consentement)</li>
                <li><strong>Logs d'accès</strong> - connexions, actions effectuées (à des fins de sécurité)</li>
              </ul>

              <p className="leading-relaxed mb-4">
                <strong>3.3 Données techniques (cookies)</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Cookies essentiels</strong> - authentification, préférences d'affichage</li>
                <li><strong>Google Analytics</strong> - statistiques de visite anonymisées (avec votre consentement)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Finalités du traitement</h2>
              <p className="leading-relaxed mb-4">
                Vos données sont utilisées pour :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Fourniture du service</strong> - gestion de vos tournées, stocks, livraisons</li>
                <li><strong>Communication</strong> - répondre à vos demandes, notifications importantes</li>
                <li><strong>Amélioration</strong> - analyser l'usage pour améliorer nos fonctionnalités</li>
                <li><strong>Sécurité</strong> - détecter et prévenir les fraudes ou accès non autorisés</li>
                <li><strong>Obligations légales</strong> - conservation des données de facturation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Base légale</h2>
              <p className="leading-relaxed">
                Le traitement de vos données repose sur :
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Exécution du contrat</strong> - pour fournir le service Sloti</li>
                <li><strong>Consentement</strong> - pour les cookies analytics et la géolocalisation</li>
                <li><strong>Intérêt légitime</strong> - sécurité, amélioration du service</li>
                <li><strong>Obligation légale</strong> - conservation des factures (10 ans)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Stockage et sécurité</h2>
              <p className="leading-relaxed">
                Vos données sont stockées sur des serveurs sécurisés <strong>Supabase</strong>, 
                situés dans l'<strong>Union Européenne (Paris, France)</strong>. 
              </p>
              <p className="leading-relaxed mt-4">
                Mesures de sécurité mises en place :
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Chiffrement en transit</strong> - TLS 1.3 (HTTPS)</li>
                <li><strong>Chiffrement au repos</strong> - AES-256</li>
                <li><strong>Isolation des données</strong> - chaque entreprise a un espace dédié</li>
                <li><strong>Authentification sécurisée</strong> - mots de passe hashés (bcrypt)</li>
                <li><strong>Sauvegardes automatiques</strong> - quotidiennes avec rétention 30 jours</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Durée de conservation</h2>
              <table className="w-full mt-3 border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Type de données</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Durée</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Prospects (formulaire)</td>
                    <td className="border border-gray-300 px-4 py-2">3 ans après dernier contact</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Données clients (compte)</td>
                    <td className="border border-gray-300 px-4 py-2">Durée du contrat + 3 ans</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Données opérationnelles</td>
                    <td className="border border-gray-300 px-4 py-2">Durée du contrat + 1 an</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Géolocalisation</td>
                    <td className="border border-gray-300 px-4 py-2">90 jours</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Logs de sécurité</td>
                    <td className="border border-gray-300 px-4 py-2">90 jours</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Factures</td>
                    <td className="border border-gray-300 px-4 py-2">10 ans (obligation légale)</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Vos droits</h2>
              <p className="leading-relaxed mb-4">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Droit d'accès</strong> - obtenir une copie de vos données</li>
                <li><strong>Droit de rectification</strong> - corriger vos données inexactes</li>
                <li><strong>Droit à l'effacement</strong> - supprimer vos données (sous conditions)</li>
                <li><strong>Droit à la portabilité</strong> - récupérer vos données dans un format standard</li>
                <li><strong>Droit d'opposition</strong> - vous opposer à certains traitements</li>
                <li><strong>Droit de limitation</strong> - restreindre le traitement</li>
                <li><strong>Droit de retrait du consentement</strong> - à tout moment pour les cookies</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Pour exercer ces droits, contactez-nous à : 
                <a href="mailto:contact@getsloti.fr" className="text-[#2792B0] hover:underline ml-1">contact@getsloti.fr</a>
              </p>
              <p className="leading-relaxed mt-2">
                Nous répondrons dans un délai maximum de 30 jours.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Cookies</h2>
              <p className="leading-relaxed mb-4">
                <strong>9.1 Cookies essentiels (toujours actifs)</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Authentification et session utilisateur</li>
                <li>Préférences d'affichage (mode sombre)</li>
                <li>Sécurité (protection CSRF)</li>
              </ul>
              
              <p className="leading-relaxed mb-4">
                <strong>9.2 Cookies analytics (avec consentement)</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Google Analytics</strong> - mesure d'audience anonymisée</li>
              </ul>
              <p className="leading-relaxed mt-3">
                Vous pouvez gérer vos préférences cookies via le bandeau affiché lors de votre première visite.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Sous-traitants</h2>
              <p className="leading-relaxed mb-4">
                Vos données peuvent être traitées par nos sous-traitants techniques :
              </p>
              <table className="w-full mt-3 border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left">Fournisseur</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Service</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Localisation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Supabase</td>
                    <td className="border border-gray-300 px-4 py-2">Base de données, authentification</td>
                    <td className="border border-gray-300 px-4 py-2">🇫🇷 Paris, France</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Netlify</td>
                    <td className="border border-gray-300 px-4 py-2">Hébergement application</td>
                    <td className="border border-gray-300 px-4 py-2">🇪🇺 CDN Europe</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Resend</td>
                    <td className="border border-gray-300 px-4 py-2">Emails transactionnels</td>
                    <td className="border border-gray-300 px-4 py-2">🇺🇸 USA (SCC)</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 px-4 py-2">Google Analytics</td>
                    <td className="border border-gray-300 px-4 py-2">Statistiques de visite</td>
                    <td className="border border-gray-300 px-4 py-2">🇺🇸 USA (SCC)</td>
                  </tr>
                </tbody>
              </table>
              <p className="leading-relaxed mt-3 text-sm">
                SCC = Standard Contractual Clauses (clauses contractuelles types approuvées par la Commission européenne)
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Transferts hors UE</h2>
              <p className="leading-relaxed">
                Certains de nos sous-traitants (Resend, Google) sont situés aux États-Unis. 
                Ces transferts sont encadrés par des <strong>Clauses Contractuelles Types (SCC)</strong> 
                approuvées par la Commission européenne, garantissant un niveau de protection adéquat.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Réclamation</h2>
              <p className="leading-relaxed">
                Si vous estimez que vos droits ne sont pas respectés, vous pouvez :
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Nous contacter à <a href="mailto:contact@getsloti.fr" className="text-[#2792B0] hover:underline">contact@getsloti.fr</a></li>
                <li>Introduire une réclamation auprès de la CNIL : <a href="https://www.cnil.fr" className="text-[#2792B0] hover:underline" target="_blank" rel="noopener noreferrer">www.cnil.fr</a></li>
              </ul>
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