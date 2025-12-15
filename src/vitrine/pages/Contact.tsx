// src/vitrine/pages/Contact.tsx
import { useState } from "react";
import { Mail, User, MessageSquare, Phone, MapPin, Send, Building } from "lucide-react";
import { supabase } from "../../supabaseClient";

// Logger conditionnel
const log = (message: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(message, ...args);
  }
};

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Honeypot anti-spam
  const [honeypot, setHoneypot] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis";
    }

    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email invalide";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Le message est requis";
    } else if (formData.message.length < 10) {
      newErrors.message = "Le message doit contenir au moins 10 caractères";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Vérification honeypot
    if (honeypot) {
      log("🤖 Bot détecté");
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmitted(true);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Sauvegarder comme lead avec source "email"
      const { error: insertError } = await supabase
        .from('leads')
        .insert([{
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          message: formData.message.trim(),
          source: 'email',
          company: null,
        }]);

      if (insertError) {
        log("❌ Erreur Supabase:", insertError);
        throw new Error("Erreur lors de l'envoi");
      }

      log("✅ Message envoyé");
      setSubmitted(true);
    } catch (err: any) {
      log("❌ Erreur:", err);
      setErrors({ submit: err.message || "Une erreur est survenue. Veuillez réessayer." });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 pt-20 px-4">
        <div className="max-w-md w-full bg-white p-8 sm:p-10 shadow-2xl rounded-2xl text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-6">
            <svg className="w-10 h-10" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Message envoyé !
          </h2>
          <p className="text-gray-600 mb-8">
            Merci pour votre message. Nous vous répondrons dans les plus brefs délais.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setFormData({ name: "", email: "", phone: "", message: "" });
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            Envoyer un autre message
          </button>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 pt-20 px-4"
      aria-labelledby="contact-title"
    >
      <div className="max-w-5xl w-full">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Partie gauche - Informations */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 sm:p-10 rounded-2xl text-white shadow-xl">
            <h1 id="contact-title" className="text-3xl sm:text-4xl font-bold mb-6">
              Contactez-nous
            </h1>
            <p className="text-blue-100 mb-8 text-lg">
              Une question ? Un projet ? Notre équipe est à votre écoute pour vous accompagner.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <a href="mailto:contact@getsloti.fr" className="text-blue-100 hover:text-white transition-colors">
                    contact@getsloti.fr
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Téléphone</h3>
                  <a href="tel:+33630671713" className="text-blue-100 hover:text-white transition-colors">
                    +33 6 30 67 17 13
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Adresse</h3>
                  <p className="text-blue-100">
                    Arras, 62000<br />
                    Hauts-de-France, France
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-white/20">
              <p className="text-blue-100 text-sm">
                Horaires de contact :<br />
                Lundi - Vendredi : 9h - 18h<br />
                Réponse sous 24h garantie
              </p>
            </div>
          </div>

          {/* Partie droite - Formulaire */}
          <div className="bg-white p-8 sm:p-10 shadow-2xl rounded-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Envoyez-nous un message
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm" role="alert">
                  {errors.submit}
                </div>
              )}

              {/* Honeypot */}
              <div 
                aria-hidden="true" 
                style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
              >
                <input
                  type="text"
                  name="website"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* Nom */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`pl-10 w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Jean Dupont"
                    aria-required="true"
                    aria-invalid={!!errors.name}
                    maxLength={100}
                  />
                </div>
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`pl-10 w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="jean.dupont@exemple.com"
                    aria-required="true"
                    aria-invalid={!!errors.email}
                    maxLength={254}
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* Téléphone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    placeholder="+33 6 12 34 56 78"
                    maxLength={20}
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 text-gray-400" size={20} />
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    className={`pl-10 w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none ${
                      errors.message ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Votre message..."
                    aria-required="true"
                    aria-invalid={!!errors.message}
                    maxLength={2000}
                  />
                </div>
                {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
              </div>

              {/* Bouton */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 sm:py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-300"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>Envoyer le message</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}