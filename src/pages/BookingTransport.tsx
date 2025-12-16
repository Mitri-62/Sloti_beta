// src/pages/BookingTransport.tsx
/**
 * Module de Booking Transport - Réservation de transporteurs externes
 * 🔒 SÉCURITÉ: Toutes les opérations utilisent le company_id de l'utilisateur
 */

import React, { useState, useEffect } from 'react';
import { 
  Truck, Package, MapPin, Calendar, Clock, Weight, Box,
  Snowflake, AlertTriangle, Search, Check, X, ChevronRight,
  Star, Euro, Timer, RefreshCw, FileText, Phone, User,
  ArrowRight, Loader2, History, Plus, Filter
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
  updateBookingStatus,
  cancelBooking,
  seedDemoCarriers
} from '../services/bookingService';
import type {
  Carrier,
  CarrierQuote,
  TransportBooking,
  TransportBookingFormData,
  MerchandiseType,
  BookingStatus
} from '../types/booking.types';
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_COLORS,
  CARRIER_TYPE_LABELS,
  MERCHANDISE_TYPE_LABELS
} from '../types/booking.types';

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

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex items-center gap-1">
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
};

// ============================================================
// ÉTAPES DU WIZARD
// ============================================================

type Step = 'form' | 'quotes' | 'confirm' | 'history';

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const BookingTransport: React.FC = () => {
  const { user } = useAuth();
  const companyId = user?.company_id ?? null; // 🔒 Récupération du company_id
  
  // États
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [quotes, setQuotes] = useState<CarrierQuote[]>([]);
  const [bookings, setBookings] = useState<TransportBooking[]>([]);
  const [currentBooking, setCurrentBooking] = useState<TransportBooking | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<CarrierQuote | null>(null);
  
  // Formulaire
  const [formData, setFormData] = useState<TransportBookingFormData>({
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
    merchandise_type: 'palette',
    merchandise_description: '',
    weight_kg: undefined,
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

  // Chargement initial
  useEffect(() => {
    if (companyId) {
      loadData();
    }
  }, [companyId]);

  const loadData = async () => {
    // 🔒 Guard clause
    if (!companyId) {
      console.warn('company_id manquant, chargement annulé');
      return;
    }

    try {
      setLoading(true);
      
      // 🔒 Charger les transporteurs avec company_id
      let carriersList = await getCarriers(companyId);
      
      // Si aucun transporteur, créer les données de démo
      if (carriersList.length === 0) {
        await seedDemoCarriers(companyId);
        carriersList = await getCarriers(companyId);
      }
      
      setCarriers(carriersList);
      
      // 🔒 Charger l'historique avec company_id
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
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value ? parseFloat(value) : undefined }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleGetQuotes = async () => {
    // 🔒 Vérification company_id
    if (!companyId || !user?.id) {
      toast.error('Erreur d\'authentification');
      return;
    }

    // Validation
    if (!formData.origin_city || !formData.destination_city) {
      toast.error('Veuillez remplir les villes de départ et d\'arrivée');
      return;
    }
    if (!formData.pickup_date) {
      toast.error('Veuillez sélectionner une date d\'enlèvement');
      return;
    }

    try {
      setLoading(true);
      
      // Créer le booking en base
      const booking = await createBooking(
        formData,
        companyId, // 🔒 Utilisation de la variable
        user.id
      );
      setCurrentBooking(booking);
      
      // 🔒 Obtenir les devis avec company_id pour le fallback
      const quotesList = await getQuotes(formData, companyId);
      setQuotes(quotesList);
      
      setStep('quotes');
      toast.success('Devis générés avec succès !');
      
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la génération des devis');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuote = (quote: CarrierQuote) => {
    setSelectedQuote(quote);
  };

  const handleConfirmBooking = async () => {
    // 🔒 Vérification company_id
    if (!currentBooking || !selectedQuote || !companyId) {
      toast.error('Erreur: données manquantes');
      return;
    }

    try {
      setLoading(true);
      
      // 🔒 Confirmation avec company_id
      const confirmed = await confirmBooking(
        currentBooking.id,
        companyId, // 🔒 Ajout du company_id
        selectedQuote.carrier.id,
        selectedQuote.carrier.name,
        selectedQuote.price,
        selectedQuote.estimated_delivery
      );
      
      setCurrentBooking(confirmed);
      setStep('confirm');
      
      // 🔒 Rafraîchir l'historique avec company_id
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
    setStep('form');
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
      merchandise_type: 'palette',
      merchandise_description: '',
      weight_kg: undefined,
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
  };

  // ============================================================
  // RENDU : FORMULAIRE
  // ============================================================
  
  const renderForm = () => (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Nouvelle demande de transport
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Comparez les offres et réservez en quelques clics
          </p>
        </div>
        <button
          onClick={() => setStep('history')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <History size={18} />
          Historique
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Origine */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <MapPin className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Point d'enlèvement</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adresse *
              </label>
              <input
                type="text"
                name="origin_address"
                value={formData.origin_address}
                onChange={handleInputChange}
                placeholder="123 rue de la Logistique"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ville *
                </label>
                <input
                  type="text"
                  name="origin_city"
                  value={formData.origin_city}
                  onChange={handleInputChange}
                  placeholder="Arras"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Code postal
                </label>
                <input
                  type="text"
                  name="origin_postal_code"
                  value={formData.origin_postal_code}
                  onChange={handleInputChange}
                  placeholder="62000"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <User size={14} className="inline mr-1" />
                  Contact
                </label>
                <input
                  type="text"
                  name="origin_contact_name"
                  value={formData.origin_contact_name}
                  onChange={handleInputChange}
                  placeholder="Jean Dupont"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Phone size={14} className="inline mr-1" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="origin_contact_phone"
                  value={formData.origin_contact_phone}
                  onChange={handleInputChange}
                  placeholder="06 12 34 56 78"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Destination */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <MapPin className="text-red-600 dark:text-red-400" size={20} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Point de livraison</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adresse *
              </label>
              <input
                type="text"
                name="destination_address"
                value={formData.destination_address}
                onChange={handleInputChange}
                placeholder="456 avenue du Commerce"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ville *
                </label>
                <input
                  type="text"
                  name="destination_city"
                  value={formData.destination_city}
                  onChange={handleInputChange}
                  placeholder="Paris"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Code postal
                </label>
                <input
                  type="text"
                  name="destination_postal_code"
                  value={formData.destination_postal_code}
                  onChange={handleInputChange}
                  placeholder="75001"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <User size={14} className="inline mr-1" />
                  Contact
                </label>
                <input
                  type="text"
                  name="destination_contact_name"
                  value={formData.destination_contact_name}
                  onChange={handleInputChange}
                  placeholder="Marie Martin"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Phone size={14} className="inline mr-1" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="destination_contact_phone"
                  value={formData.destination_contact_phone}
                  onChange={handleInputChange}
                  placeholder="06 98 76 54 32"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marchandise */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Package className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Marchandise</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type *
            </label>
            <select
              name="merchandise_type"
              value={formData.merchandise_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(MERCHANDISE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantité
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity || ''}
              onChange={handleInputChange}
              min="1"
              placeholder="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Weight size={14} className="inline mr-1" />
              Poids (kg)
            </label>
            <input
              type="number"
              name="weight_kg"
              value={formData.weight_kg || ''}
              onChange={handleInputChange}
              placeholder="500"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Box size={14} className="inline mr-1" />
              Volume (m³)
            </label>
            <input
              type="number"
              name="volume_m3"
              value={formData.volume_m3 || ''}
              onChange={handleInputChange}
              placeholder="2.5"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <input
            type="text"
            name="merchandise_description"
            value={formData.merchandise_description}
            onChange={handleInputChange}
            placeholder="Palettes de produits alimentaires..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Options spéciales */}
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_fragile"
              checked={formData.is_fragile}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              🔸 Fragile
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_dangerous"
              checked={formData.is_dangerous}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              <AlertTriangle size={14} className="inline text-orange-500" /> Matière dangereuse
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="temperature_controlled"
              checked={formData.temperature_controlled}
              onChange={handleInputChange}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              <Snowflake size={14} className="inline text-blue-500" /> Température dirigée
            </span>
          </label>
        </div>
      </div>

      {/* Dates */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Calendar className="text-purple-600 dark:text-purple-400" size={20} />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Date d'enlèvement</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              name="pickup_date"
              value={formData.pickup_date}
              onChange={handleInputChange}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Clock size={14} className="inline mr-1" />
              Heure de début
            </label>
            <input
              type="time"
              name="pickup_time_from"
              value={formData.pickup_time_from}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Clock size={14} className="inline mr-1" />
              Heure de fin
            </label>
            <input
              type="time"
              name="pickup_time_to"
              value={formData.pickup_time_to}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <FileText size={14} className="inline mr-1" />
          Instructions particulières
        </label>
        <textarea
          name="special_instructions"
          value={formData.special_instructions}
          onChange={handleInputChange}
          rows={3}
          placeholder="Accès par le quai n°3, appeler 30 min avant arrivée..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Bouton */}
      <div className="flex justify-end">
        <button
          onClick={handleGetQuotes}
          disabled={loading || !companyId}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Search size={20} />
          )}
          Rechercher des transporteurs
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );

  // ============================================================
  // RENDU : DEVIS
  // ============================================================

  const renderQuotes = () => (
    <div className="space-y-6">
      {/* En-tête */}
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
          onClick={() => setStep('form')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw size={18} />
          Modifier la recherche
        </button>
      </div>

      {/* Liste des devis */}
      <div className="space-y-4">
        {quotes.map((quote, index) => (
          <div
            key={quote.carrier.id}
            onClick={() => handleSelectQuote(quote)}
            className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-2 transition-all cursor-pointer ${
              selectedQuote?.carrier.id === quote.carrier.id
                ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Badge position */}
                {index === 0 && (
                  <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                    MEILLEUR PRIX
                  </div>
                )}
                {index === 1 && quotes[0].delivery_delay_hours > quote.delivery_delay_hours && (
                  <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full">
                    PLUS RAPIDE
                  </div>
                )}
                
                {/* Logo / Nom transporteur */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
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

              {/* Prix et délai */}
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
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Estimée le {format(quote.estimated_delivery, 'dd/MM/yyyy', { locale: fr })}
                </div>
              </div>
            </div>

            {/* Sélectionné */}
            {selectedQuote?.carrier.id === quote.carrier.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Check size={18} />
                  <span className="font-medium">Sélectionné</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConfirmBooking();
                  }}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      Confirmer la réservation
                      <ArrowRight size={18} />
                    </>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
        {/* Icône succès */}
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="text-green-600 dark:text-green-400" size={40} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Réservation confirmée !
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Votre transport a été réservé avec succès
        </p>

        {/* Détails */}
        {currentBooking && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 text-left mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Référence</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {currentBooking.reference}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Transporteur</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {currentBooking.carrier_name}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">N° de suivi</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {currentBooking.tracking_number}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Prix</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {currentBooking.quoted_price?.toFixed(2)} €
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Enlèvement</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {format(new Date(currentBooking.pickup_date), 'dd/MM/yyyy', { locale: fr })}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Livraison estimée</span>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {currentBooking.delivery_date_estimated && 
                    format(new Date(currentBooking.delivery_date_estimated), 'dd/MM/yyyy', { locale: fr })}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-green-500" />
                <span className="text-gray-600 dark:text-gray-300">
                  {currentBooking.origin_city}
                </span>
                <ArrowRight size={16} className="text-gray-400" />
                <MapPin size={16} className="text-red-500" />
                <span className="text-gray-600 dark:text-gray-300">
                  {currentBooking.destination_city}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setStep('history')}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Voir l'historique
          </button>
          <button
            onClick={handleNewBooking}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus size={18} />
            Nouvelle demande
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
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Historique des réservations
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {bookings.length} réservation(s)
          </p>
        </div>
        <button
          onClick={handleNewBooking}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus size={18} />
          Nouvelle demande
        </button>
      </div>

      {/* Liste */}
      {bookings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <Truck className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Aucune réservation
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Créez votre première demande de transport
          </p>
          <button
            onClick={handleNewBooking}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus size={18} />
            Nouvelle demande
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Référence
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Trajet
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Transporteur
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Prix
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-4">
                    <span className="font-mono text-sm text-gray-900 dark:text-white">
                      {booking.reference}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                      <span>{booking.origin_city}</span>
                      <ArrowRight size={14} className="text-gray-400" />
                      <span>{booking.destination_city}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {format(new Date(booking.pickup_date), 'dd/MM/yyyy', { locale: fr })}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {booking.carrier_name || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {booking.quoted_price ? `${booking.quoted_price.toFixed(2)} €` : '-'}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================

  // 🔒 Afficher un message si pas de company_id
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb / Steps */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <button
          onClick={handleNewBooking}
          className={`flex items-center gap-1 ${step === 'form' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}
        >
          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
          Demande
        </button>
        <ChevronRight size={16} className="text-gray-400" />
        <span className={`flex items-center gap-1 ${step === 'quotes' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 'quotes' || step === 'confirm' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>2</span>
          Devis
        </span>
        <ChevronRight size={16} className="text-gray-400" />
        <span className={`flex items-center gap-1 ${step === 'confirm' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 'confirm' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>3</span>
          Confirmation
        </span>
      </div>

      {/* Contenu selon l'étape */}
      {step === 'form' && renderForm()}
      {step === 'quotes' && renderQuotes()}
      {step === 'confirm' && renderConfirmation()}
      {step === 'history' && renderHistory()}
    </div>
  );
};

export default BookingTransport;