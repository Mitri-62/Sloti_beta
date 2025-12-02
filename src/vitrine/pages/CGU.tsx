// src/vitrine/pages/CGU.tsx
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function CGU() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Conditions Générales d'Utilisation</h1>
          
          <div className="space-y-8 text-gray-700">
            
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Objet</h2>
              <p className="leading-relaxed">
                Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès 
                et l'utilisation de la plateforme Sloti, accessible à l'adresse 
                <a href="https://getsloti.fr" className="text-[#2792B0] hover:underline mx-1">getsloti.fr</a>.
                En utilisant nos services, vous acceptez ces conditions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description du service</h2>
              <p className="leading-relaxed">
                Sloti est une plateforme SaaS de gestion logistique permettant :
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>La gestion des stocks et emplacements</li>
                <li>La visualisation 3D de l'entrepôt</li>
                <li>L'optimisation du chargement camion</li>
                <li>La planification des tournées</li>
                <li>La communication interne d'équipe</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Accès au service</h2>
              <p className="leading-relaxed">
                <strong>3.1 Inscription</strong><br />
                L'accès à Sloti nécessite la création d'un compte. Vous vous engagez à 
                fournir des informations exactes et à maintenir la confidentialité de 
                vos identifiants.
              </p>
              <p className="leading-relaxed mt-4">
                <strong>3.2 Bêta privée</strong><br />
                Durant la phase de bêta (Décembre 2025 - Février 2026), l'accès est 
                gratuit et limité à 15 entreprises sélectionnées. Les fonctionnalités 
                peuvent évoluer et des bugs peuvent survenir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Obligations de l'utilisateur</h2>
              <p className="leading-relaxed">
                L'utilisateur s'engage à :
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Utiliser le service conformément à sa destination</li>
                <li>Ne pas tenter de compromettre la sécurité du système</li>
                <li>Ne pas revendre ou redistribuer l'accès au service</li>
                <li>Respecter les droits de propriété intellectuelle</li>
                <li>Ne pas utiliser le service à des fins illégales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Propriété des données</h2>
              <p className="leading-relaxed">
                <strong>5.1 Vos données</strong><br />
                Vous restez propriétaire de toutes les données que vous saisissez dans Sloti 
                (stocks, commandes, contacts, etc.).
              </p>
              <p className="leading-relaxed mt-4">
                <strong>5.2 Portabilité</strong><br />
                Vous pouvez exporter vos données à tout moment au format CSV/Excel.
              </p>
              <p className="leading-relaxed mt-4">
                <strong>5.3 En cas de résiliation</strong><br />
                Vos données seront conservées 30 jours après la fin de votre abonnement, 
                puis supprimées définitivement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Tarification</h2>
              <p className="leading-relaxed">
                <strong>6.1 Bêta privée</strong><br />
                Gratuit jusqu'en Février 2026.
              </p>
              <p className="leading-relaxed mt-4">
                <strong>6.2 Tarif early adopter</strong><br />
                149€ HT/mois, garanti à vie pour les participants à la bêta.
              </p>
              <p className="leading-relaxed mt-4">
                <strong>6.3 Tarif standard</strong><br />
                349€ HT/mois après le lancement public (Mars 2026).
              </p>
              <p className="leading-relaxed mt-4">
                <strong>6.4 Facturation</strong><br />
                Paiement mensuel par carte bancaire ou prélèvement SEPA.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Résiliation</h2>
              <p className="leading-relaxed">
                <strong>7.1 Par l'utilisateur</strong><br />
                Vous pouvez résilier votre abonnement à tout moment depuis votre tableau 
                de bord, sans frais ni justification. La résiliation prend effet à la fin 
                de la période en cours.
              </p>
              <p className="leading-relaxed mt-4">
                <strong>7.2 Par Sloti</strong><br />
                Nous nous réservons le droit de suspendre ou résilier un compte en cas de 
                violation des présentes CGU, après notification préalable.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Disponibilité et support</h2>
              <p className="leading-relaxed">
                <strong>8.1 Disponibilité</strong><br />
                Nous nous efforçons d'assurer une disponibilité de 99% du service. 
                Des interruptions pour maintenance peuvent survenir, avec notification préalable.
              </p>
              <p className="leading-relaxed mt-4">
                <strong>8.2 Support</strong><br />
                Support par email à <a href="mailto:contact@getsloti.fr" className="text-[#2792B0] hover:underline">contact@getsloti.fr</a>. 
                Temps de réponse : 24h ouvrées (48h en période de bêta).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Limitation de responsabilité</h2>
              <p className="leading-relaxed">
                Sloti est fourni "en l'état". Nous ne garantissons pas l'absence totale 
                d'erreurs ou d'interruptions. Notre responsabilité est limitée au montant 
                des sommes versées au cours des 12 derniers mois. Nous ne sommes pas 
                responsables des dommages indirects (perte de données, manque à gagner).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Modifications des CGU</h2>
              <p className="leading-relaxed">
                Nous pouvons modifier ces CGU à tout moment. Les utilisateurs seront 
                informés par email des modifications substantielles. L'utilisation 
                continue du service vaut acceptation des nouvelles conditions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Droit applicable</h2>
              <p className="leading-relaxed">
                Les présentes CGU sont régies par le droit français. En cas de litige, 
                une solution amiable sera recherchée avant toute action judiciaire. 
                À défaut, les tribunaux d'Arras seront compétents.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact</h2>
              <p className="leading-relaxed">
                Pour toute question concernant ces CGU :<br />
                Email : <a href="mailto:contact@getsloti.fr" className="text-[#2792B0] hover:underline">contact@getsloti.fr</a><br />
                Adresse : Arras, 62000, France
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