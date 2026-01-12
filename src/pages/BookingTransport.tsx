// src/pages/BookingTransport.tsx
/**
 * Module de Booking Transport - Réservation de transporteurs externes
 * ✨ Version améliorée avec autocomplétion d'adresses et wizard en étapes
 * 🔒 SÉCURITÉ: Toutes les opérations utilisent le company_id de l'utilisateur
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Truck, Package, MapPin, Calendar, Clock, Weight, Box,
  Snowflake, AlertTriangle, Search, Check, X, ChevronRight, ChevronLeft,
  Star, Euro, Timer, RefreshCw, FileText, Phone, User,
  ArrowRight, Loader2, History, Plus, Filter, Save
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

import { useAuth } from '../contexts/AuthContext';
import {
  getCarriers,
  getQuotes,
  createBooking,
  confirmBooking,
  getBookings,
  seedDemoCarriers
} from '../services/bookingService';
import type {
  Carrier,
  CarrierQuote,
  TransportBooking,
  TransportBookingFormData,
} from '../types/booking.types';
import {
  BOOKING_STATUS_LABELS,
  CARRIER_TYPE_LABELS,
  MERCHANDISE_TYPE_LABELS,
  BookingStatus
} from '../types/booking.types';

// ============================================================
// TYPES
// ============================================================

interface AddressSuggestion {
  label: string;
  housenumber?: string;
  street?: string;
  postcode: string;
  city: string;
  context: string;
}

type WizardStep = 1 | 2 | 3;
type ViewStep = 'wizard' | 'quotes' | 'confirm' | 'history';

// ============================================================
// HOOK: Autocomplétion d'adresses (API gouv.fr)
// ============================================================

const useAddressAutocomplete = () => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const searchAddress = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
        );
        const data = await response.json();
        
        const results: AddressSuggestion[] = data.features.map((f: any) => ({
          label: f.properties.label,
          housenumber: f.properties.housenumber,
          street: f.properties.street,
          postcode: f.properties.postcode,
          city: f.properties.city,
          context: f.properties.context,
        }));
        
        setSuggestions(results);
      } catch (error) {
        console.error('Erreur recherche adresse:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return { suggestions, loading, searchAddress, clearSuggestions };
};

// ============================================================
// COMPOSANT: Champ d'adresse avec autocomplétion
// ============================================================

interface AddressInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: AddressSuggestion) => void;
  icon?: React.ReactNode;
  required?: boolean;
}

const AddressInput: React.FC<AddressInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  icon,
  required
}) => {
  const { suggestions, loading, searchAddress, clearSuggestions } = useAddressAutocomplete();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fermer les suggestions quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    searchAddress(val);
    setShowSuggestions(true);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    onSelect(suggestion);
    setShowSuggestions(false);
    clearSuggestions();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {icon && <span className="inline-block mr-1">{icon}</span>}
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="animate-spin text-gray-400" size={18} />
          </div>
        )}
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                {suggestion.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {suggestion.context}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// COMPOSANTS UTILITAIRES
// ============================================================

const StatusBadge: React.FC<{ status: BookingStatus }> = ({ status }) => {
  const colors: Record<BookingStatus, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    quoted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    in_transit: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
};

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={14}
        className={star <= Math.round(rating) 
          ? 'text-yellow-400 fill-yellow-400' 
          : 'text-gray-300 dark:text-gray-600'}
      />
    ))}
    <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">
      {rating.toFixed(1)}
    </span>
  </div>
);

// Progress Steps
const WizardProgress: React.FC<{ currentStep: WizardStep }> = ({ currentStep }) => {
  const steps = [
    { num: 1, label: 'Adresses', icon: MapPin },
    { num: 2, label: 'Colis', icon: Package },
    { num: 3, label: 'Résumé', icon: FileText },
  ];

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.num;
        const isCompleted = currentStep > step.num;
        
        return (
          <React.Fragment key={step.num}>
            <div className="flex flex-col items-center">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-all
                ${isCompleted ? 'bg-green-500 text-white' : ''}
                ${isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900' : ''}
                ${!isActive && !isCompleted ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : ''}
              `}>
                {isCompleted ? <Check size={24} /> : <Icon size={24} />}
              </div>
              <span className={`mt-2 text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 md:w-24 h-1 mx-2 rounded ${isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const BookingTransport: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.company_id ?? null;
  
  // États
  const [viewStep, setViewStep] = useState<ViewStep>('wizard');
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [quotes, setQuotes] = useState<CarrierQuote[]>([]);
  const [bookings, setBookings] = useState<TransportBooking[]>([]);
  const [currentBooking, setCurrentBooking] = useState<TransportBooking | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<CarrierQuote | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  
  // Formulaire
  const [formData, setFormData] = useState<TransportBookingFormData>(() => {
    // Charger le brouillon depuis localStorage
    const saved = localStorage.getItem('sloti_booking_draft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Erreur chargement brouillon:', e);
      }
    }
    return {
      origin_address: '',
      origin_city: '',
      origin_postal_code: '',
      origin_contact_name: '',
      origin_contact_phone: '',
      destination_address: '',
      destination_city: '',
      destination_postal_code: '',
      destination_contact_name: '',
      destination_contact_phone: '',
      merchandise_type: 'colis',
      merchandise_description: '',
      weight_kg: 1,
      volume_m3: undefined,
      quantity: 1,
      is_fragile: false,
      is_dangerous: false,
      temperature_controlled: false,
      pickup_date: format(new Date(), 'yyyy-MM-dd'),
      pickup_time_from: '08:00',
      pickup_time_to: '18:00',
      special_instructions: ''
    };
  });

  // Sauvegarde automatique du brouillon (seulement si wizard actif)
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  
  useEffect(() => {
    // Ne pas sauvegarder si pas dans le wizard
    if (viewStep !== 'wizard') return;
    
    const timer = setTimeout(() => {
      localStorage.setItem('sloti_booking_draft', JSON.stringify(formDataRef.current));
      setDraftSaved(true);
      const hideTimer = setTimeout(() => setDraftSaved(false), 2000);
      return () => clearTimeout(hideTimer);
    }, 2000); // Augmenté à 2s pour éviter les sauvegardes trop fréquentes
    
    return () => clearTimeout(timer);
  }, [formData.origin_postal_code, formData.destination_postal_code, formData.weight_kg, viewStep]);

  // Chargement initial
  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const loadData = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      let carriersList = await getCarriers(companyId);
      
      if (carriersList.length === 0) {
        await seedDemoCarriers(companyId);
        carriersList = await getCarriers(companyId);
      }
      
      setCarriers(carriersList);
      const bookingsList = await getBookings(companyId);
      setBookings(bookingsList);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const updateFormData = (updates: Partial<TransportBookingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleOriginAddressSelect = (address: AddressSuggestion) => {
    updateFormData({
      origin_address: address.street 
        ? `${address.housenumber || ''} ${address.street}`.trim()
        : address.label.split(',')[0],
      origin_city: address.city,
      origin_postal_code: address.postcode,
    });
  };

  const handleDestinationAddressSelect = (address: AddressSuggestion) => {
    updateFormData({
      destination_address: address.street 
        ? `${address.housenumber || ''} ${address.street}`.trim()
        : address.label.split(',')[0],
      destination_city: address.city,
      destination_postal_code: address.postcode,
    });
  };

  const validateStep = (step: WizardStep): boolean => {
    if (step === 1) {
      if (!formData.origin_city || !formData.origin_postal_code) {
        toast.error('Veuillez renseigner l\'adresse d\'enlèvement');
        return false;
      }
      if (!formData.destination_city || !formData.destination_postal_code) {
        toast.error('Veuillez renseigner l\'adresse de livraison');
        return false;
      }
    }
    if (step === 2) {
      if (!formData.weight_kg || formData.weight_kg <= 0) {
        toast.error('Veuillez indiquer le poids du colis');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(wizardStep)) {
      if (wizardStep < 3) {
        setWizardStep((wizardStep + 1) as WizardStep);
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const prevStep = () => {
    if (wizardStep > 1) {
      setWizardStep((wizardStep - 1) as WizardStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGetQuotes = async () => {
    if (!companyId || !user?.id) {
      toast.error('Erreur d\'authentification');
      return;
    }

    if (!validateStep(1) || !validateStep(2)) return;

    try {
      setLoading(true);
      
      const booking = await createBooking(formData, companyId, user.id);
      setCurrentBooking(booking);
      
      const quotesList = await getQuotes(formData, companyId);
      setQuotes(quotesList);
      
      // Effacer le brouillon
      localStorage.removeItem('sloti_booking_draft');
      
      setViewStep('quotes');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(`${quotesList.length} offres trouvées !`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!currentBooking || !selectedQuote || !companyId) {
      toast.error('Erreur: données manquantes');
      return;
    }

    try {
      setLoading(true);
      
      const confirmed = await confirmBooking(
        currentBooking.id,
        companyId,
        selectedQuote.carrier.id,
        selectedQuote.carrier.name,
        selectedQuote.price,
        selectedQuote.estimated_delivery
      );
      
      setCurrentBooking(confirmed);
      setViewStep('confirm');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      const bookingsList = await getBookings(companyId);
      setBookings(bookingsList);
      
      toast.success('Réservation confirmée !');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la confirmation');
    } finally {
      setLoading(false);
    }
  };

  const handleNewBooking = () => {
    setViewStep('wizard');
    setWizardStep(1);
    setCurrentBooking(null);
    setSelectedQuote(null);
    setQuotes([]);
    setFormData({
      origin_address: '',
      origin_city: '',
      origin_postal_code: '',
      origin_contact_name: '',
      origin_contact_phone: '',
      destination_address: '',
      destination_city: '',
      destination_postal_code: '',
      destination_contact_name: '',
      destination_contact_phone: '',
      merchandise_type: 'colis',
      merchandise_description: '',
      weight_kg: 1,
      volume_m3: undefined,
      quantity: 1,
      is_fragile: false,
      is_dangerous: false,
      temperature_controlled: false,
      pickup_date: format(new Date(), 'yyyy-MM-dd'),
      pickup_time_from: '08:00',
      pickup_time_to: '18:00',
      special_instructions: ''
    });
    localStorage.removeItem('sloti_booking_draft');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================================
  // RENDU : WIZARD ÉTAPE 1 - ADRESSES
  // ============================================================
  
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Origine */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
            <MapPin className="text-green-600 dark:text-green-400" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Point d'enlèvement</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Où récupérer le colis ?</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <AddressInput
            label="Adresse"
            placeholder="Commencez à taper une adresse..."
            value={formData.origin_address}
            onChange={(v) => updateFormData({ origin_address: v })}
            onSelect={handleOriginAddressSelect}
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Code postal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.origin_postal_code}
                onChange={(e) => updateFormData({ origin_postal_code: e.target.value })}
                placeholder="62000"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ville <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.origin_city}
                onChange={(e) => updateFormData({ origin_city: e.target.value })}
                placeholder="Arras"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <User size={14} className="inline mr-1" /> Contact
              </label>
              <input
                type="text"
                value={formData.origin_contact_name}
                onChange={(e) => updateFormData({ origin_contact_name: e.target.value })}
                placeholder="Jean Dupont"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Phone size={14} className="inline mr-1" /> Téléphone
              </label>
              <input
                type="tel"
                value={formData.origin_contact_phone}
                onChange={(e) => updateFormData({ origin_contact_phone: e.target.value })}
                placeholder="06 12 34 56 78"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Flèche */}
      <div className="flex justify-center">
        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
          <ArrowRight className="text-gray-400 rotate-90" size={24} />
        </div>
      </div>

      {/* Destination */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
            <MapPin className="text-red-600 dark:text-red-400" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Point de livraison</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Où livrer le colis ?</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <AddressInput
            label="Adresse"
            placeholder="Commencez à taper une adresse..."
            value={formData.destination_address}
            onChange={(v) => updateFormData({ destination_address: v })}
            onSelect={handleDestinationAddressSelect}
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Code postal <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.destination_postal_code}
                onChange={(e) => updateFormData({ destination_postal_code: e.target.value })}
                placeholder="75001"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ville <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.destination_city}
                onChange={(e) => updateFormData({ destination_city: e.target.value })}
                placeholder="Paris"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <User size={14} className="inline mr-1" /> Contact
              </label>
              <input
                type="text"
                value={formData.destination_contact_name}
                onChange={(e) => updateFormData({ destination_contact_name: e.target.value })}
                placeholder="Marie Martin"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Phone size={14} className="inline mr-1" /> Téléphone
              </label>
              <input
                type="tel"
                value={formData.destination_contact_phone}
                onChange={(e) => updateFormData({ destination_contact_phone: e.target.value })}
                placeholder="06 98 76 54 32"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // RENDU : WIZARD ÉTAPE 2 - COLIS
  // ============================================================
  
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Package className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Détails du colis</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Qu'envoyez-vous ?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Type de marchandise */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type de marchandise
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MERCHANDISE_TYPE_LABELS).slice(0, 4).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateFormData({ merchandise_type: value as any })}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    formData.merchandise_type === value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Poids */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Weight size={14} className="inline mr-1" /> Poids (kg) <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <input
                type="range"
                min="0.1"
                max="30"
                step="0.1"
                value={formData.weight_kg || 1}
                onChange={(e) => updateFormData({ weight_kg: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.weight_kg || ''}
                  onChange={(e) => updateFormData({ weight_kg: parseFloat(e.target.value) || undefined })}
                  min="0.1"
                  step="0.1"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                />
                <span className="text-gray-500 dark:text-gray-400">kg</span>
              </div>
            </div>
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantité
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateFormData({ quantity: Math.max(1, (formData.quantity || 1) - 1) })}
                className="w-12 h-12 rounded-xl border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                -
              </button>
              <span className="text-2xl font-bold text-gray-900 dark:text-white w-12 text-center">
                {formData.quantity || 1}
              </span>
              <button
                type="button"
                onClick={() => updateFormData({ quantity: (formData.quantity || 1) + 1 })}
                className="w-12 h-12 rounded-xl border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                +
              </button>
            </div>
          </div>

          {/* Volume */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Box size={14} className="inline mr-1" /> Volume (m³) <span className="text-gray-400">(optionnel)</span>
            </label>
            <input
              type="number"
              value={formData.volume_m3 || ''}
              onChange={(e) => updateFormData({ volume_m3: parseFloat(e.target.value) || undefined })}
              placeholder="0.5"
              step="0.1"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Description */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description du contenu
          </label>
          <input
            type="text"
            value={formData.merchandise_description}
            onChange={(e) => updateFormData({ merchandise_description: e.target.value })}
            placeholder="Ex: Vêtements, électronique, documents..."
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Options spéciales */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Options spéciales</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => updateFormData({ is_fragile: !formData.is_fragile })}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                formData.is_fragile
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                  : 'border-gray-200 dark:border-gray-600 hover:border-orange-300'
              }`}
            >
              🔸 Fragile
            </button>
            
            <button
              type="button"
              onClick={() => updateFormData({ is_dangerous: !formData.is_dangerous })}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                formData.is_dangerous
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  : 'border-gray-200 dark:border-gray-600 hover:border-red-300'
              }`}
            >
              <AlertTriangle size={18} /> Dangereux
            </button>
            
            <button
              type="button"
              onClick={() => updateFormData({ temperature_controlled: !formData.temperature_controlled })}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                formData.temperature_controlled
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
              }`}
            >
              <Snowflake size={18} /> Température dirigée
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // RENDU : WIZARD ÉTAPE 3 - RÉSUMÉ
  // ============================================================
  
  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Résumé du trajet */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-blue-200 text-sm">Départ</p>
              <p className="font-bold text-lg">{formData.origin_city}</p>
              <p className="text-blue-200 text-sm">{formData.origin_postal_code}</p>
            </div>
            <ArrowRight size={32} className="text-blue-300" />
            <div>
              <p className="text-blue-200 text-sm">Arrivée</p>
              <p className="font-bold text-lg">{formData.destination_city}</p>
              <p className="text-blue-200 text-sm">{formData.destination_postal_code}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-sm">Colis</p>
            <p className="font-bold text-2xl">{formData.weight_kg} kg</p>
            {formData.quantity && formData.quantity > 1 && (
              <p className="text-blue-200 text-sm">x{formData.quantity}</p>
            )}
          </div>
        </div>
      </div>

      {/* Date d'enlèvement */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <Calendar className="text-purple-600 dark:text-purple-400" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Date d'enlèvement</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Quand récupérer le colis ?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.pickup_date}
              onChange={(e) => updateFormData({ pickup_date: e.target.value })}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock size={14} className="inline mr-1" /> De
            </label>
            <input
              type="time"
              value={formData.pickup_time_from}
              onChange={(e) => updateFormData({ pickup_time_from: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock size={14} className="inline mr-1" /> À
            </label>
            <input
              type="time"
              value={formData.pickup_time_to}
              onChange={(e) => updateFormData({ pickup_time_to: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <FileText size={14} className="inline mr-1" /> Instructions particulières
        </label>
        <textarea
          value={formData.special_instructions}
          onChange={(e) => updateFormData({ special_instructions: e.target.value })}
          rows={3}
          placeholder="Ex: Appeler 30 min avant, accès par le quai n°3..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
        />
      </div>
    </div>
  );

  // ============================================================
  // RENDU : DEVIS
  // ============================================================

  const renderQuotes = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {quotes.length} offres disponibles
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formData.origin_city} → {formData.destination_city} • {formData.pickup_date}
          </p>
        </div>
        <button
          onClick={() => { setViewStep('wizard'); setWizardStep(1); }}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
        >
          <RefreshCw size={18} />
          Modifier la recherche
        </button>
      </div>

      <div className="space-y-4">
        {quotes.map((quote, index) => (
          <div
            key={quote.carrier.id}
            onClick={() => setSelectedQuote(quote)}
            className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border-2 transition-all cursor-pointer ${
              selectedQuote?.carrier.id === quote.carrier.id
                ? 'border-blue-500 ring-4 ring-blue-100 dark:ring-blue-900/50'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {index === 0 && (
                  <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                    MEILLEUR PRIX
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                    <Truck className="text-gray-500 dark:text-gray-400" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {quote.carrier.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {CARRIER_TYPE_LABELS[quote.carrier.type]}
                      </span>
                      <RatingStars rating={quote.carrier.rating} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {quote.price.toFixed(2)} €
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <Timer size={14} />
                  <span>
                    Livraison {quote.delivery_delay_hours < 24 
                      ? `en ${quote.delivery_delay_hours}h` 
                      : `sous ${Math.round(quote.delivery_delay_hours / 24)} jour(s)`}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Estimée le {format(quote.estimated_delivery, 'dd/MM/yyyy', { locale: fr })}
                </div>
              </div>
            </div>

            {selectedQuote?.carrier.id === quote.carrier.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Check size={18} />
                  <span className="font-medium">Sélectionné</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleConfirmBooking(); }}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : (
                    <>Confirmer la réservation <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================================
  // RENDU : CONFIRMATION
  // ============================================================

  const renderConfirmation = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="text-green-600 dark:text-green-400" size={40} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Réservation confirmée !
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Votre transport a été réservé avec succès
        </p>

        {currentBooking && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 text-left mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Référence</span>
                <p className="font-semibold text-gray-900 dark:text-white">{currentBooking.reference}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Transporteur</span>
                <p className="font-semibold text-gray-900 dark:text-white">{currentBooking.carrier_name}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">N° de suivi</span>
                <p className="font-semibold text-gray-900 dark:text-white">{currentBooking.tracking_number}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Prix</span>
                <p className="font-semibold text-gray-900 dark:text-white">{currentBooking.quoted_price?.toFixed(2)} €</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setViewStep('history')}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            Voir l'historique
          </button>
          <button
            onClick={handleNewBooking}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            <Plus size={18} /> Nouvelle demande
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // RENDU : HISTORIQUE
  // ============================================================

  const renderHistory = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleNewBooking}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Retour"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Historique des réservations</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{bookings.length} réservation(s)</p>
          </div>
        </div>
        <button
          onClick={handleNewBooking}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          <Plus size={18} /> Nouvelle demande
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <Truck className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aucune réservation</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Créez votre première demande de transport</p>
          <button
            onClick={handleNewBooking}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            <Plus size={18} /> Nouvelle demande
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">{booking.origin_city}</span>
                    <ArrowRight size={14} className="text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">{booking.destination_city}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(booking.pickup_date), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-gray-900 dark:text-white">
                    {booking.quoted_price ? `${booking.quoted_price.toFixed(2)} €` : '-'}
                  </span>
                  <StatusBadge status={booking.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================

  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Truck className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400">
            Erreur d'authentification. Veuillez vous reconnecter.
          </p>
        </div>
      </div>
    );
  }

  if (loading && carriers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {viewStep === 'wizard' ? 'Nouvelle expédition' : 
             viewStep === 'quotes' ? 'Choisir un transporteur' :
             viewStep === 'confirm' ? 'Confirmation' : 'Historique'}
          </h1>
          {draftSaved && viewStep === 'wizard' && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
              <Save size={14} /> Brouillon sauvegardé
            </p>
          )}
        </div>
        {viewStep !== 'history' && (
          <button
            onClick={() => {
              setViewStep('history');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <History size={18} />
            <span className="hidden md:inline">Historique</span>
          </button>
        )}
      </div>

      {/* Wizard Progress */}
      {viewStep === 'wizard' && <WizardProgress currentStep={wizardStep} />}

      {/* Content */}
      {viewStep === 'wizard' && wizardStep === 1 && renderStep1()}
      {viewStep === 'wizard' && wizardStep === 2 && renderStep2()}
      {viewStep === 'wizard' && wizardStep === 3 && renderStep3()}
      {viewStep === 'quotes' && renderQuotes()}
      {viewStep === 'confirm' && renderConfirmation()}
      {viewStep === 'history' && renderHistory()}

      {/* Navigation Wizard */}
      {viewStep === 'wizard' && (
        <div className="flex justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={wizardStep === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              wizardStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ChevronLeft size={20} />
            Précédent
          </button>

          {wizardStep < 3 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Suivant
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={handleGetQuotes}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              Rechercher des offres
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingTransport;