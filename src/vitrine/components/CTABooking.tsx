// src/vitrine/components/CTABooking.tsx
// Section CTA améliorée avec prise de RDV intégrée
import { useState } from 'react';
import { Calendar, Sparkles, Clock, CheckCircle, Users } from 'lucide-react';
import BookingWidget from './BookingWidget'; // 👈 Même dossier

export default function CTABooking() {
  const [showBooking, setShowBooking] = useState(false);

  const benefits = [
    { icon: Clock, text: "Démo personnalisée 30 min" },
    { icon: Users, text: "Accès beta gratuit" },
    { icon: Sparkles, text: "249€/mois à vie (au lieu de 349€)" },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Text */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-yellow-500/20 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-300">
                Plus que 14 places en beta
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Prêt à simplifier
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                votre logistique ?
              </span>
            </h2>

            <p className="text-lg text-gray-300 mb-8">
              Rejoignez les entreprises de transport des Hauts-de-France qui 
              optimisent déjà leurs tournées avec Sloti.
            </p>

            {/* Benefits */}
            <div className="space-y-4 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3 text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <benefit.icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span>{benefit.text}</span>
                </div>
              ))}
            </div>

            {/* Mobile CTA */}
            <div className="lg:hidden">
              <button
                onClick={() => setShowBooking(true)}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-lg hover:from-cyan-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Réserver ma démo gratuite
              </button>
            </div>

            {/* Trust badges */}
            <div className="hidden lg:flex items-center gap-6 mt-8 pt-8 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Sans engagement</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Données en France 🇫🇷</span>
              </div>
            </div>
          </div>

          {/* Right: Booking Widget */}
          <div className="hidden lg:block">
            <BookingWidget 
              onBookingComplete={(booking) => {
                console.log('Booking completed:', booking);
              }}
            />
          </div>
        </div>
      </div>

      {/* Mobile Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowBooking(false)}
          />
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2">
            <BookingWidget 
              onBookingComplete={(booking) => {
                console.log('Booking completed:', booking);
                setShowBooking(false);
              }}
            />
            <button
              onClick={() => setShowBooking(false)}
              className="mt-4 w-full py-3 text-gray-400 hover:text-white"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}