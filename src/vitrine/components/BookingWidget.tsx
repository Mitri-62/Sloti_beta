// src/vitrine/components/BookingWidget.tsx
// Widget de prise de RDV professionnel connecté à Supabase
import { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Check, ArrowRight, ArrowLeft, 
  User, Mail, Phone, Building2, Loader2 
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

interface BookingWidgetProps {
  onBookingComplete?: (booking: BookingData) => void;
  className?: string;
}

interface BookingData {
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  company: string;
}

// Créneaux disponibles
const TIME_SLOTS = [
  { time: "09:00", label: "9h00" },
  { time: "09:30", label: "9h30" },
  { time: "10:00", label: "10h00" },
  { time: "10:30", label: "10h30" },
  { time: "11:00", label: "11h00" },
  { time: "11:30", label: "11h30" },
  { time: "14:00", label: "14h00" },
  { time: "14:30", label: "14h30" },
  { time: "15:00", label: "15h00" },
  { time: "15:30", label: "15h30" },
  { time: "16:00", label: "16h00" },
  { time: "16:30", label: "16h30" },
  { time: "17:00", label: "17h00" },
];

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function BookingWidget({ onBookingComplete, className = "" }: BookingWidgetProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Lundi
    const monday = new Date(today.setDate(diff));
    // Si on est après jeudi, on passe à la semaine suivante
    if (new Date().getDay() > 4 || new Date().getDay() === 0) {
      monday.setDate(monday.getDate() + 7);
    }
    return monday;
  });
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les créneaux déjà réservés pour la semaine
  useEffect(() => {
    loadBookedSlots();
  }, [currentWeekStart]);

  const loadBookedSlots = async () => {
    try {
      const weekDates = getWeekDates();
      const slots: Record<string, string[]> = {};
      
      for (const date of weekDates) {
        const dateStr = date.toISOString().split('T')[0];
        const { data, error } = await supabase.rpc('get_booked_slots', { 
          target_date: dateStr 
        });
        
        if (!error && data) {
          slots[dateStr] = data.map((d: { booking_time: string }) => 
            d.booking_time.substring(0, 5) // "09:00:00" -> "09:00"
          );
        }
      }
      
      setBookedSlots(slots);
    } catch (err) {
      console.error('Erreur chargement créneaux:', err);
    }
  };

  // Générer les dates de la semaine
  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Navigation semaines
  const goToNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const goToPrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    // Ne pas aller avant cette semaine
    const thisMonday = new Date();
    thisMonday.setDate(thisMonday.getDate() - thisMonday.getDay() + 1);
    if (prev >= thisMonday) {
      setCurrentWeekStart(prev);
    }
  };

  const isDateAvailable = (date: Date) => {
    const day = date.getDay();
    // Pas de weekend
    if (day === 0 || day === 6) return false;
    // Pas dans le passé
    if (date < today) return false;
    // Pas aujourd'hui (besoin de délai)
    const todayStr = new Date().toISOString().split('T')[0];
    if (date.toISOString().split('T')[0] === todayStr) return false;
    return true;
  };

  const isSlotAvailable = (time: string) => {
    if (!selectedDate) return true;
    const booked = bookedSlots[selectedDate] || [];
    return !booked.includes(time);
  };

  const handleDateSelect = (date: Date) => {
    if (!isDateAvailable(date)) return;
    setSelectedDate(date.toISOString().split('T')[0]);
    setSelectedTime("");
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !formData.name || !formData.email) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      // Insérer dans Supabase
      const { error: insertError } = await supabase
        .from('demo_bookings')
        .insert({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || null,
          company: formData.company.trim() || null,
          booking_date: selectedDate,
          booking_time: selectedTime,
          status: 'pending',
          source: 'website'
        });

      if (insertError) {
        console.error('Erreur insertion:', insertError);
        throw new Error('Impossible de réserver ce créneau. Veuillez réessayer.');
      }

      // Succès !
      setIsComplete(true);
      
      // Envoyer email de confirmation via Edge Function
      try {
        await supabase.functions.invoke('send-booking-confirmation', {
          body: {
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            company: formData.company.trim() || undefined,
            date: selectedDate,
            time: selectedTime,
          }
        });
      } catch (emailError) {
        // Ne pas bloquer si l'email échoue
        console.error('Erreur envoi email:', emailError);
      }

      onBookingComplete?.({
        date: selectedDate,
        time: selectedTime,
        ...formData
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date pour affichage
  const formatSelectedDate = () => {
    if (!selectedDate) return "";
    const date = new Date(selectedDate + 'T00:00:00');
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  // Écran de confirmation
  if (isComplete) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-8 text-center shadow-xl ${className}`}>
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          RDV confirmé ! 🎉
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {formatSelectedDate()} à {selectedTime}
        </p>
        <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4 text-left">
          <p className="text-sm text-cyan-800 dark:text-cyan-200 mb-2">
            <strong>Prochaines étapes :</strong>
          </p>
          <ul className="text-sm text-cyan-700 dark:text-cyan-300 space-y-1">
            <li>✓ Confirmation envoyée à {formData.email}</li>
            <li>✓ Lien Google Meet dans l'email</li>
            <li>✓ Dimitri vous contactera si besoin</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold">Réserver une démo</h3>
            <p className="text-cyan-100 text-sm">30 min • Gratuit • Sans engagement</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { num: 1, label: "Date" },
          { num: 2, label: "Heure" },
          { num: 3, label: "Coordonnées" }
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => {
              if (s.num === 1) setStep(1);
              if (s.num === 2 && selectedDate) setStep(2);
              if (s.num === 3 && selectedDate && selectedTime) setStep(3);
            }}
            className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
              step === s.num 
                ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600' 
                : step > s.num 
                  ? 'text-green-600 dark:text-green-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' 
                  : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            {step > s.num ? '✓' : s.num}. {s.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* Step 1: Calendrier semaine */}
        {step === 1 && (
          <div>
            {/* Navigation mois */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goToPrevWeek}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="font-semibold text-gray-900 dark:text-white">
                {MONTHS_FR[currentWeekStart.getMonth()]} {currentWeekStart.getFullYear()}
              </span>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Grille semaine */}
            <div className="grid grid-cols-7 gap-1">
              {/* Headers jours */}
              {DAYS_FR.map((day, i) => (
                <div 
                  key={day} 
                  className={`text-center text-xs font-medium py-2 ${
                    i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {day}
                </div>
              ))}
              
              {/* Dates */}
              {weekDates.map((date) => {
                const dateStr = date.toISOString().split('T')[0];
                const isAvailable = isDateAvailable(date);
                const isSelected = selectedDate === dateStr;
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDateSelect(date)}
                    disabled={!isAvailable}
                    className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center
                      text-sm font-medium transition-all
                      ${isSelected 
                        ? 'bg-cyan-600 text-white shadow-lg scale-105' 
                        : isAvailable 
                          ? 'hover:bg-cyan-50 dark:hover:bg-cyan-900/20 text-gray-900 dark:text-white cursor-pointer border-2 border-transparent hover:border-cyan-300' 
                          : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      }
                      ${isToday && !isSelected ? 'ring-2 ring-cyan-400 ring-offset-2' : ''}
                    `}
                  >
                    <span className="text-lg">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            {/* Légende */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-cyan-600"></div>
                <span>Sélectionné</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded ring-2 ring-cyan-400"></div>
                <span>Aujourd'hui</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Créneaux horaires */}
        {step === 2 && (
          <div>
            <button 
              onClick={() => setStep(1)}
              className="text-sm text-cyan-600 hover:underline mb-3 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Changer la date
            </button>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                📅 {formatSelectedDate()}
              </p>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Sélectionnez un créneau :
            </p>

            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map(({ time, label }) => {
                const available = isSlotAvailable(time);
                const isSelected = selectedTime === time;
                
                return (
                  <button
                    key={time}
                    onClick={() => {
                      if (available) {
                        setSelectedTime(time);
                        setStep(3);
                      }
                    }}
                    disabled={!available}
                    className={`
                      py-2.5 px-3 rounded-lg text-sm font-medium transition-all
                      ${isSelected 
                        ? 'bg-cyan-600 text-white' 
                        : available 
                          ? 'bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-cyan-400 text-gray-900 dark:text-white' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 line-through cursor-not-allowed'
                      }
                    `}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {Object.values(bookedSlots).flat().length > 0 && (
              <p className="text-xs text-gray-500 mt-3 text-center">
                Les créneaux barrés sont déjà réservés
              </p>
            )}
          </div>
        )}

        {/* Step 3: Formulaire */}
        {step === 3 && (
          <div>
            <button 
              onClick={() => setStep(2)}
              className="text-sm text-cyan-600 hover:underline mb-3 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Changer l'heure
            </button>
            
            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-cyan-800 dark:text-cyan-200">
                📅 {formatSelectedDate()} à {selectedTime}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Votre nom *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email professionnel *"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="Téléphone (optionnel)"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Entreprise (optionnel)"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.email || isSubmitting}
              className="w-full mt-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Réservation en cours...
                </>
              ) : (
                <>
                  Confirmer le RDV
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              En confirmant, vous acceptez d'être contacté par email concernant votre démo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}