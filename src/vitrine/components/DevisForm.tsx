// src/vitrine/components/DevisForm.tsx
import { useState } from "react";
import { Mail, User, MessageSquare, Send, CheckCircle, Building, Phone } from "lucide-react";
import { supabase } from "../../supabaseClient";

// Logger conditionnel (pas de logs en production)
const log = (message: string, ...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(message, ...args);
  }
};

export default function DevisForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // 🍯 Honeypot anti-spam (champ invisible pour les bots)
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

    // Nom
    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Le nom doit contenir au moins 2 caractères";
    }

    // Email
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email invalide";
    }

    // Message
    if (!formData.message.trim()) {
      newErrors.message = "Le message est requis";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Le message doit contenir au moins 10 caractères";
    }

    // Téléphone (optionnel mais validé si rempli)
    if (formData.phone && !/^[\d\s\+\-\(\)\.]{6,20}$/.test(formData.phone)) {
      newErrors.phone = "Numéro de téléphone invalide";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🍯 Vérification honeypot - si rempli, c'est un bot
    if (honeypot) {
      log("🤖 Bot détecté via honeypot");
      // Fake success pour ne pas alerter le bot
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmitted(true);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Sauvegarder dans Supabase
      const { error: insertError } = await supabase
        .from('leads')
        .insert([{
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          company: formData.company.trim() || null,
          phone: formData.phone.trim() || null,
          message: formData.message.trim(),
          source: 'site', // Source par défaut
        }]);

      if (insertError) {
        log("❌ Erreur Supabase:", insertError);
        
        // Gérer les erreurs de contraintes SQL
        if (insertError.code === '23514') {
          if (insertError.message.includes('email_format')) {
            throw new Error("Format d'email invalide");
          }
          if (insertError.message.includes('message_min_length')) {
            throw new Error("Le message est trop court");
          }
          if (insertError.message.includes('name_not_empty')) {
            throw new Error("Le nom est requis");
          }
        }
        throw new Error("Erreur lors de l'envoi de votre demande");
      }

      log("✅ Lead sauvegardé avec succès !");

      // 2️⃣ Envoyer la notification email
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        log("📧 Envoi de l'email...");
        
        const emailResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-lead-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              name: formData.name.trim(),
              email: formData.email.trim().toLowerCase(),
              company: formData.company.trim() || null,
              phone: formData.phone.trim() || null,
              message: formData.message.trim(),
            }),
          }
        );

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          log("⚠️ Email notification failed:", errorData);
        } else {
          log("📧 Email envoyé avec succès !");
        }
      } catch (emailError) {
        // Ne pas bloquer si l'email échoue
        log("⚠️ Email error:", emailError);
      }

      setSubmitted(true);
      
    } catch (err: any) {
      log("❌ Erreur:", err);
      setErrors({ submit: err.message || "Une erreur est survenue, veuillez réessayer." });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section id="devis" className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-6">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              🎉 Bienvenue dans la bêta !
            </h2>
            <p className="text-gray-600 mb-8">
              Votre demande a bien été enregistrée. Vous recevrez vos accès par email sous 24h.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({ name: "", email: "", company: "", phone: "", message: "" });
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              Envoyer une nouvelle demande
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section 
      id="devis" 
      className="py-12 sm:py-16 lg:py-20 bg-gray-50"
      aria-labelledby="devis-title"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h2 
            id="devis-title"
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
          >
            Rejoindre la bêta
          </h2>
          <p className="text-base sm:text-lg text-gray-600">
            Testez Sloti <strong>gratuitement pendant 3 mois</strong>, puis conservez le tarif early adopter à vie.
          </p>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10 space-y-6"
          noValidate
        >
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm" role="alert">
              {errors.submit}
            </div>
          )}

          {/* 🍯 HONEYPOT - Champ invisible pour les bots */}
          <div 
            aria-hidden="true" 
            style={{ 
              position: 'absolute', 
              left: '-9999px', 
              top: '-9999px',
              opacity: 0,
              height: 0,
              overflow: 'hidden'
            }}
          >
            <label htmlFor="website">Ne pas remplir ce champ</label>
            <input
              type="text"
              id="website"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Nom */}
          <div>
            <label 
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nom complet <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={20}
                aria-hidden="true"
              />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`pl-10 w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.name 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Jean Dupont"
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                maxLength={100}
              />
            </div>
            {errors.name && (
              <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label 
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email professionnel <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={20}
                aria-hidden="true"
              />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`pl-10 w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.email 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="jean.dupont@entreprise.fr"
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                maxLength={254}
              />
            </div>
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          {/* Entreprise */}
          <div>
            <label 
              htmlFor="company"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Entreprise
            </label>
            <div className="relative">
              <Building 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={20}
                aria-hidden="true"
              />
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Nom de votre entreprise"
                maxLength={100}
              />
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <label 
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Téléphone
            </label>
            <div className="relative">
              <Phone 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
                size={20}
                aria-hidden="true"
              />
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`pl-10 w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.phone 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="+33 6 12 34 56 78"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                maxLength={20}
              />
            </div>
            {errors.phone && (
              <p id="phone-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <label 
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Votre projet <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MessageSquare 
                className="absolute left-3 top-3 text-gray-400" 
                size={20}
                aria-hidden="true"
              />
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                className={`pl-10 w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none ${
                  errors.message 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Décrivez votre projet, vos besoins logistiques, le nombre d'utilisateurs prévus..."
                aria-required="true"
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? "message-error" : undefined}
                maxLength={2000}
              />
            </div>
            {errors.message && (
              <p id="message-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {formData.message.length}/2000 caractères
            </p>
          </div>

          {/* Bouton submit */}
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
                <span>Envoyer ma demande</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            En soumettant ce formulaire, vous acceptez notre{" "}
            <a href="/confidentialite" className="text-blue-600 hover:underline">
              politique de confidentialité
            </a>.
          </p>
        </form>
      </div>
    </section>
  );
}