// src/vitrine/pages/MentionsLegales.tsx
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function MentionsLegales() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Mentions légales</h1>
          
          <div className="space-y-8 text-gray-700">
            
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Éditeur du site</h2>
              <p className="leading-relaxed">
                Le site <strong>getsloti.fr</strong> est édité par :<br /><br />
                <strong>Sloti</strong><br />
                Dimitri Deremarque - Entrepreneur individuel<br />
                {/* TODO: Ajouter SIRET après création entreprise en janvier 2025 */}
                {/* SIRET : XXX XXX XXX XXXXX */}
                Adresse : Arras, 62000, France<br />
                Email : <a href="mailto:contact@getsloti.fr" className="text-[#2792B0] hover:underline">contact@getsloti.fr</a><br />
                Téléphone : +33 6 30 67 17 13
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Directeur de la publication</h2>
              <p className="leading-relaxed">
                <strong>Dimitri Deremarque</strong><br />
                Email : <a href="mailto:contact@getsloti.fr" className="text-[#2792B0] hover:underline">contact@getsloti.fr</a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Hébergement</h2>
              <p className="leading-relaxed">
                <strong>Application web :</strong><br />
                Netlify, Inc.<br />
                44 Montgomery Street, Suite 300<br />
                San Francisco, California 94104, USA<br />
                <a href="https://www.netlify.com" className="text-[#2792B0] hover:underline" target="_blank" rel="noopener noreferrer">www.netlify.com</a>
              </p>
              <p className="leading-relaxed mt-4">
                <strong>Base de données :</strong><br />
                Supabase, Inc.<br />
                Serveurs situés dans l'Union Européenne (Paris, France)<br />
                <a href="https://supabase.com" className="text-[#2792B0] hover:underline" target="_blank" rel="noopener noreferrer">www.supabase.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Propriété intellectuelle</h2>
              <p className="leading-relaxed">
                L'ensemble du contenu de ce site (textes, images, logos, icônes, logiciels, 
                code source) est la propriété exclusive de Sloti ou de ses partenaires et 
                est protégé par les lois françaises et internationales relatives à la 
                propriété intellectuelle.
              </p>
              <p className="leading-relaxed mt-4">
                Toute reproduction, représentation, modification, publication, adaptation, 
                totale ou partielle, de l'un quelconque de ces éléments, par quelque moyen 
                que ce soit, sans l'autorisation écrite préalable de Sloti, est interdite 
                et constituerait une contrefaçon sanctionnée par les articles L.335-2 et 
                suivants du Code de la propriété intellectuelle.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Protection des données personnelles</h2>
              <p className="leading-relaxed">
                Conformément au Règlement Général sur la Protection des Données (RGPD), 
                vous disposez d'un droit d'accès, de rectification, de suppression et de 
                portabilité de vos données personnelles.
              </p>
              <p className="leading-relaxed mt-4">
                Pour plus d'informations, consultez notre{" "}
                <Link to="/confidentialite" className="text-[#2792B0] hover:underline">
                  Politique de confidentialité
                </Link>.
              </p>
              <p className="leading-relaxed mt-4">
                Pour exercer vos droits, contactez-nous à :{" "}
                <a href="mailto:contact@getsloti.fr" className="text-[#2792B0] hover:underline">
                  contact@getsloti.fr
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Cookies</h2>
              <p className="leading-relaxed">
                Ce site utilise des cookies essentiels au fonctionnement du service 
                (authentification, préférences) ainsi que des cookies analytics 
                (Google Analytics) soumis à votre consentement.
              </p>
              <p className="leading-relaxed mt-4">
                Pour plus d'informations, consultez notre{" "}
                <Link to="/confidentialite" className="text-[#2792B0] hover:underline">
                  Politique de confidentialité
                </Link>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitation de responsabilité</h2>
              <p className="leading-relaxed">
                Sloti s'efforce de fournir des informations exactes et à jour sur ce site. 
                Toutefois, nous ne pouvons garantir l'exactitude, la complétude ou 
                l'actualité des informations diffusées.
              </p>
              <p className="leading-relaxed mt-4">
                Sloti ne saurait être tenu responsable :
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Des erreurs ou omissions dans le contenu du site</li>
                <li>Des dommages directs ou indirects résultant de l'utilisation du site</li>
                <li>Des interruptions temporaires du service pour maintenance</li>
                <li>De l'utilisation frauduleuse des informations par des tiers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Liens hypertextes</h2>
              <p className="leading-relaxed">
                Ce site peut contenir des liens vers des sites tiers. Sloti n'exerce 
                aucun contrôle sur ces sites et décline toute responsabilité quant à 
                leur contenu ou leurs pratiques en matière de confidentialité.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Droit applicable</h2>
              <p className="leading-relaxed">
                Les présentes mentions légales sont régies par le droit français. 
                En cas de litige, et après tentative de résolution amiable, les 
                tribunaux français seront seuls compétents.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact</h2>
              <p className="leading-relaxed">
                Pour toute question concernant ces mentions légales :<br /><br />
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