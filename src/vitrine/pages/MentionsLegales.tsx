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
                <strong>Dimitri Deremarque</strong><br />
                Entrepreneur individuel<br />
                Adresse : Arras, 62000, France<br />
                Email : <a href="mailto:contact@getsloti.fr" className="text-[#2792B0] hover:underline">contact@getsloti.fr</a><br />
                Téléphone : +33 6 30 67 17 13
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Hébergement</h2>
              <p className="leading-relaxed">
                <strong>Site web :</strong><br />
                Netlify, Inc.<br />
                44 Montgomery Street, Suite 300<br />
                San Francisco, California 94104, USA<br />
                <a href="https://www.netlify.com" className="text-[#2792B0] hover:underline" target="_blank" rel="noopener noreferrer">www.netlify.com</a>
              </p>
              <p className="leading-relaxed mt-4">
                <strong>Base de données :</strong><br />
                Supabase, Inc. (serveurs EU - Allemagne)<br />
                970 Toa Payoh North #07-04, Singapore 318992<br />
                <a href="https://supabase.com" className="text-[#2792B0] hover:underline" target="_blank" rel="noopener noreferrer">www.supabase.com</a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Propriété intellectuelle</h2>
              <p className="leading-relaxed">
                L'ensemble du contenu de ce site (textes, images, logos, icônes, logiciels) 
                est la propriété exclusive de Sloti ou de ses partenaires. Toute reproduction, 
                représentation, modification ou exploitation non autorisée est interdite.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Responsabilité</h2>
              <p className="leading-relaxed">
                Sloti s'efforce de fournir des informations exactes et à jour. Toutefois, 
                nous ne pouvons garantir l'exactitude, la complétude ou l'actualité des 
                informations diffusées sur ce site. Sloti ne saurait être tenu responsable 
                des dommages directs ou indirects résultant de l'utilisation de ce site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Droit applicable</h2>
              <p className="leading-relaxed">
                Les présentes mentions légales sont régies par le droit français. 
                En cas de litige, les tribunaux français seront seuls compétents.
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