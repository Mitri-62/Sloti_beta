import { useState } from "react";
import { Mail, User, MessageSquare, Send, CheckCircle } from "lucide-react";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Effacer l'erreur du champ modifié
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

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Simuler l'envoi (à remplacer par votre vraie API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Décommenter quand l'API est prête
      /*
      const response = await fetch(
        "https://<PROJECT>.functions.supabase.co/send-lead-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error("Erreur lors de l'envoi du devis");
      }
      */

      setSubmitted(true);
    } catch (err) {
      console.error("Erreur:", err);
      setErrors({ submit: "Une erreur est survenue, veuillez réessayer." });
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
              Merci pour votre demande !
            </h2>
            <p className="text-gray-600 mb-8">
              Votre demande de devis a bien été envoyée. Notre équipe vous contactera dans les plus brefs délais.
            </p>
            <button
              onClick={() => setSubmitted(false)}
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
            Demander un devis
          </h2>
          <p className="text-base sm:text-lg text-gray-600">
            Remplissez ce formulaire pour recevoir une offre personnalisée adaptée à vos besoins.
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
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="Nom de votre entreprise"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label 
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Téléphone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              placeholder="+33 1 23 45 67 89"
            />
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
              />
            </div>
            {errors.message && (
              <p id="message-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.message}
              </p>
            )}
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
            En soumettant ce formulaire, vous acceptez notre politique de confidentialité.
          </p>
        </form>
      </div>
    </section>
  );
}