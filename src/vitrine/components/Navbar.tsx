// src/vitrine/components/Navbar.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "../../assets/Sloti.svg";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: "#features", label: "Fonctionnalités" },
    { href: "#pricing", label: "Tarifs" },
    /*{ href: "#news", label: "Actualités" },*/
    { href: "#DevisForm", label: "Devis" },
  ];

  return (
    <header
      className={`w-full fixed top-0 z-50 transition-all duration-500 ${
        scrolled ? "bg-white shadow-md" : "bg-transparent"
      }`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 sm:h-20">
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label="Retour à l'accueil Sloti"
        >
          <img 
            src={logo} 
            alt="" 
            className="h-12 sm:h-16 md:h-20 w-auto" 
            aria-hidden="true"
          />
          <span
            className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${
              scrolled ? "text-[#F91974]" : "text-white"
            }`}
            style={{
              textShadow: scrolled 
                ? 'none' 
                : '0 2px 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)'
            }}
          >
            Sloti.
          </span>
        </Link>

        {/* Navigation desktop */}
        <nav
          className={`hidden md:flex items-center gap-6 lg:gap-8 font-medium transition-colors duration-300 ${
            scrolled ? "text-gray-800" : "text-white"
          }`}
          style={{
            textShadow: scrolled 
              ? 'none' 
              : '0 2px 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)'
          }}
          aria-label="Navigation principale"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-[#FFBC45] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Bouton Connexion desktop */}
        <div className="hidden md:block">
          <Link
            to="/login"
            className={`px-4 lg:px-6 py-2 rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              scrolled
                ? "text-gray-700 hover:bg-gray-100"
                : "text-white hover:bg-white/10"
            }`}
            style={{
              textShadow: scrolled 
                ? 'none' 
                : '0 2px 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)'
            }}
          >
            Connexion
          </Link>
        </div>

        {/* Bouton menu hamburger mobile */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`md:hidden p-2 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            scrolled ? "text-gray-800" : "text-white"
          }`}
          style={{
            filter: scrolled 
              ? 'none' 
              : 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'
          }}
          aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menu mobile */}
      <div
        className={`md:hidden fixed inset-0 top-16 sm:top-20 bg-white transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <nav className="flex flex-col p-6 space-y-4" aria-label="Navigation mobile">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={handleLinkClick}
              className="text-lg font-medium text-gray-800 hover:text-[#FFBC45] py-3 border-b border-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              {link.label}
            </a>
          ))}
          
          <Link
            to="/login"
            onClick={handleLinkClick}
            className="mt-4 px-6 py-3 bg-blue-600 text-white text-center rounded-lg font-medium hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Connexion
          </Link>
        </nav>
      </div>
    </header>
  );
}