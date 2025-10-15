// src/vitrine/components/Footer.tsx
import { Globe, Twitter, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import logo from "../../assets/Sloti.svg";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer 
      className="bg-gradient-to-r from-[#8BC34A] to-[#2792B0] text-white"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-10 lg:py-12">
        {/* Contenu principal du footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Logo et description */}
          <div className="flex flex-col items-center sm:items-start">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={logo}
                alt=""
                className="h-10 w-auto"
                aria-hidden="true"
              />
              <span className="text-xl sm:text-2xl font-bold">Sloti.</span>
            </div>
            <p className="text-sm text-gray-100 text-center sm:text-left max-w-xs">
              Simplifiez vos flux logistiques avec une solution moderne et intuitive.
            </p>
          </div>

          {/* Liens rapides */}
          <div className="text-center sm:text-left">
            <h3 className="font-semibold text-lg mb-4">Navigation</h3>
            <nav className="space-y-2" aria-label="Liens de navigation du footer">
              <a 
                href="#features" 
                className="block text-sm hover:text-[#FFBC45] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white rounded px-1"
              >
                Fonctionnalités
              </a>
              <a 
                href="#pricing" 
                className="block text-sm hover:text-[#FFBC45] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white rounded px-1"
              >
                Tarifs
              </a>
              <a 
                href="#faq" 
                className="block text-sm hover:text-[#FFBC45] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white rounded px-1"
              >
                FAQ
              </a>
              <a 
                href="#DevisForm" 
                className="block text-sm hover:text-[#FFBC45] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white rounded px-1"
              >
                Devis
              </a>
            </nav>
          </div>

          {/* Contact */}
          <div className="text-center sm:text-left">
            <h3 className="font-semibold text-lg mb-4">Contact</h3>
            <div className="space-y-3">
              <a 
                href="mailto:contact@sloti.fr" 
                className="flex items-center gap-2 text-sm hover:text-[#FFBC45] transition-colors duration-200 justify-center sm:justify-start focus:outline-none focus:ring-2 focus:ring-white rounded px-1"
                aria-label="Envoyer un email à contact@sloti.fr"
              >
                <Mail size={16} aria-hidden="true" />
                <span>contact@sloti.fr</span>
              </a>
              <a 
                href="tel:+33123456789" 
                className="flex items-center gap-2 text-sm hover:text-[#FFBC45] transition-colors duration-200 justify-center sm:justify-start focus:outline-none focus:ring-2 focus:ring-white rounded px-1"
                aria-label="Appeler le +33 1 23 45 67 89"
              >
                <Phone size={16} aria-hidden="true" />
                <span>+33 1 23 45 67 89</span>
              </a>
              <div className="flex items-center gap-2 text-sm justify-center sm:justify-start">
                <MapPin size={16} aria-hidden="true" />
                <span>Paris, France</span>
              </div>
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div className="text-center sm:text-left">
            <h3 className="font-semibold text-lg mb-4">Suivez-nous</h3>
            <div className="flex gap-4 justify-center sm:justify-start" role="list" aria-label="Liens des réseaux sociaux">
              <a 
                href="https://www.sloti.fr" 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#FFBC45] transition-colors duration-200 p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Visiter notre site web"
              >
                <Globe size={24} />
              </a>
              <a 
                href="https://twitter.com/sloti" 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#FFBC45] transition-colors duration-200 p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Nous suivre sur Twitter"
              >
                <Twitter size={24} />
              </a>
              <a 
                href="https://linkedin.com/company/sloti" 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#FFBC45] transition-colors duration-200 p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Nous suivre sur LinkedIn"
              >
                <Linkedin size={24} />
              </a>
            </div>
          </div>
        </div>

        {/* Séparateur */}
        <div className="border-t border-white/20 my-6"></div>

        {/* Bas de page */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-100">
          <p className="text-center sm:text-left">
            © {currentYear} Sloti. Tous droits réservés.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="#" 
              className="hover:text-[#FFBC45] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white rounded px-1"
            >
              Mentions légales
            </a>
            <a 
              href="#" 
              className="hover:text-[#FFBC45] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white rounded px-1"
            >
              Politique de confidentialité
            </a>
            <a 
              href="#" 
              className="hover:text-[#FFBC45] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white rounded px-1"
            >
              CGU
            </a>
          </div>
        </div>

        {/* Bouton retour en haut */}
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 z-40"
          aria-label="Retour en haut de la page"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
          </svg>
        </button>
      </div>
    </footer>
  );
}