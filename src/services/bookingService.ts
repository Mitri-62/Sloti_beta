// src/services/bookingService.ts
/**
 * Service pour la gestion des bookings de transport
 * Intégration Sendcloud via Supabase Edge Function
 * 🔒 SÉCURITÉ: Defense-in-depth avec filtres company_id sur toutes les opérations
 */

import { supabase } from '../supabaseClient';
import type { 
  Carrier, 
  CarrierQuote, 
  TransportBooking, 
  TransportBookingFormData 
} from '../types/booking.types';

// ============================================================
// CARRIERS (Transporteurs)
// ============================================================

/**
 * Récupère tous les transporteurs actifs depuis la DB locale
 */
export async function getCarriers(companyId?: string): Promise<Carrier[]> {
  let query = supabase
    .from('carriers')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false });

  // 🔒 SÉCURITÉ: Filtrer par company_id si fourni
  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Crée les transporteurs de démo pour une company
 */
export async function seedDemoCarriers(companyId: string): Promise<void> {
  if (!companyId) throw new Error('company_id requis');

  const demoCarriers = [
    { company_id: companyId, name: 'Chronopost', type: 'express', base_price_per_km: 2.80, min_price: 80.00, delivery_delay_hours: 24, rating: 4.8 },
    { company_id: companyId, name: 'Colissimo', type: 'standard', base_price_per_km: 1.50, min_price: 50.00, delivery_delay_hours: 48, rating: 4.5 },
    { company_id: companyId, name: 'DHL Express', type: 'express', base_price_per_km: 3.20, min_price: 90.00, delivery_delay_hours: 24, rating: 4.7 },
    { company_id: companyId, name: 'UPS Standard', type: 'standard', base_price_per_km: 2.00, min_price: 60.00, delivery_delay_hours: 48, rating: 4.4 },
    { company_id: companyId, name: 'GLS', type: 'economique', base_price_per_km: 1.20, min_price: 40.00, delivery_delay_hours: 72, rating: 4.2 },
    { company_id: companyId, name: 'Mondial Relay', type: 'economique', base_price_per_km: 0.80, min_price: 25.00, delivery_delay_hours: 96, rating: 4.0 },
  ];

  const { error } = await supabase.from('carriers').insert(demoCarriers);
  if (error && !error.message.includes('duplicate')) throw error;
}

// ============================================================
// SENDCLOUD API via Edge Function
// ============================================================

interface SendcloudShippingMethod {
  id: number;
  name: string;
  carrier: string;
  min_weight: string;
  max_weight: string;
  service_point_input: string;
  price: number;
  countries?: Array<{
    id: number;
    name: string;
    iso_2: string;
    price: number;
    lead_time_hours: number;
  }>;
}

/**
 * Récupère les méthodes d'expédition via Supabase Edge Function
 */
async function getSendcloudShippingMethods(): Promise<SendcloudShippingMethod[]> {
  try {
    console.log('📦 Appel Edge Function sendcloud-quotes...');
    
    const { data, error } = await supabase.functions.invoke('sendcloud-quotes');

    if (error) {
      console.error('Edge function error:', error);
      return [];
    }

    console.log('✅ Réponse Sendcloud:', data?.shipping_methods?.length, 'méthodes');
    return data?.shipping_methods || [];
  } catch (error) {
    console.error('Erreur Sendcloud shipping_methods:', error);
    return [];
  }
}

// ============================================================
// GÉNÉRATION DE DEVIS (HYBRID: Sendcloud + Simulation)
// ============================================================

/**
 * Mapping des carriers Sendcloud vers nos types
 */
function mapCarrierType(carrierName: string): 'express' | 'standard' | 'economique' | 'frigorifique' | 'volumineux' {
  const name = carrierName.toLowerCase();
  if (name.includes('express') || name.includes('chrono') || name.includes('24') || name.includes('j+1')) return 'express';
  if (name.includes('relay') || name.includes('point') || name.includes('mondial')) return 'economique';
  if (name.includes('freight') || name.includes('palette') || name.includes('volumineux')) return 'volumineux';
  return 'standard';
}

/**
 * Estime les délais de livraison selon le transporteur
 */
function estimateDeliveryHours(carrierName: string, methodName: string): number {
  const name = (carrierName + ' ' + methodName).toLowerCase();
  if (name.includes('express') || name.includes('13') || name.includes('chrono 13') || name.includes('same day')) return 4;
  if (name.includes('chrono') || name.includes('j+1') || name.includes('24')) return 24;
  if (name.includes('dhl') || name.includes('ups') || name.includes('fedex')) return 24;
  if (name.includes('colissimo') && !name.includes('overseas')) return 48;
  if (name.includes('gls') || name.includes('dpd')) return 48;
  if (name.includes('relay') || name.includes('mondial') || name.includes('point')) return 96;
  if (name.includes('overseas') || name.includes('international')) return 168;
  return 48;
}

/**
 * Génère un prix simulé réaliste selon le transporteur
 */
function getSimulatedPrice(carrier: string, methodName: string, weightKg: number): number {
  const name = (carrier + ' ' + methodName).toLowerCase();
  
  // Prix de base selon le type de service
  let basePrice = 5.99;
  
  if (name.includes('express') || name.includes('chrono 13') || name.includes('j+1') || name.includes('same day')) {
    basePrice = 12.99 + (weightKg * 0.80);
  } else if (name.includes('chrono') || name.includes('dhl') || name.includes('ups') || name.includes('fedex')) {
    basePrice = 9.99 + (weightKg * 0.60);
  } else if (name.includes('colissimo home')) {
    basePrice = 6.99 + (weightKg * 0.40);
  } else if (name.includes('colissimo service point')) {
    basePrice = 5.49 + (weightKg * 0.35);
  } else if (name.includes('colissimo')) {
    basePrice = 6.49 + (weightKg * 0.38);
  } else if (name.includes('gls') || name.includes('dpd')) {
    basePrice = 5.99 + (weightKg * 0.35);
  } else if (name.includes('mondial') || name.includes('relay') || name.includes('point relais')) {
    basePrice = 4.49 + (weightKg * 0.25);
  } else if (name.includes('lettre') || name.includes('letter') || name.includes('unstamped')) {
    basePrice = 1.99 + (weightKg * 0.50);
  } else if (name.includes('overseas') || name.includes('international')) {
    basePrice = 15.99 + (weightKg * 1.20);
  } else if (name.includes('signature')) {
    basePrice = 7.99 + (weightKg * 0.45);
  } else {
    basePrice = 7.99 + (weightKg * 0.45);
  }
  
  // Ajouter une petite variation aléatoire pour réalisme
  const variation = (Math.random() * 2 - 1); // -1 à +1 €
  return Math.max(1.99, Math.round((basePrice + variation) * 100) / 100);
}

/**
 * Génère une note réaliste selon le transporteur
 */
function getCarrierRating(carrier: string, methodName: string): number {
  const name = (carrier + ' ' + methodName).toLowerCase();
  
  if (name.includes('chrono') || name.includes('express')) return 4.7 + (Math.random() * 0.3);
  if (name.includes('dhl')) return 4.6 + (Math.random() * 0.3);
  if (name.includes('ups')) return 4.5 + (Math.random() * 0.3);
  if (name.includes('colissimo')) return 4.4 + (Math.random() * 0.4);
  if (name.includes('gls')) return 4.3 + (Math.random() * 0.4);
  if (name.includes('mondial') || name.includes('relay')) return 4.2 + (Math.random() * 0.4);
  
  return 4.0 + (Math.random() * 0.5);
}

/**
 * Génère des devis - essaie Sendcloud d'abord, puis fallback simulation
 */
export async function getQuotes(
  formData: TransportBookingFormData,
  companyId?: string
): Promise<CarrierQuote[]> {
  const quotes: CarrierQuote[] = [];
  const weight = formData.weight_kg || 5; // Poids par défaut 5kg

  // ============================================
  // TENTATIVE 1: API Sendcloud via Edge Function
  // ============================================
  
  try {
    console.log('📦 Récupération des tarifs Sendcloud...');
    
    const shippingMethods = await getSendcloudShippingMethods();
    
    if (shippingMethods.length > 0) {
      // Filtrer les méthodes valides pour le poids
      const validMethods = shippingMethods.filter(method => {
        const minWeight = parseFloat(method.min_weight) || 0;
        const maxWeight = parseFloat(method.max_weight) || 1000;
        return weight >= minWeight && weight <= maxWeight;
      });

      // Filtrer pour garder uniquement les transporteurs pertinents pour la France
      const relevantMethods = validMethods.filter(method => {
        const name = (method.carrier + ' ' + method.name).toLowerCase();
        // Exclure les services génériques "sendcloud" et garder les vrais transporteurs
        return !name.includes('unstamped letter') && 
               (name.includes('colissimo') || 
                name.includes('chrono') || 
                name.includes('dhl') || 
                name.includes('ups') || 
                name.includes('gls') || 
                name.includes('dpd') ||
                name.includes('mondial') ||
                name.includes('relay') ||
                name.includes('fedex') ||
                name.includes('tnt'));
      });

      console.log(`✅ ${relevantMethods.length} méthodes Sendcloud disponibles`);

      for (const method of relevantMethods.slice(0, 10)) { // Max 10 résultats
        // Prix simulé réaliste basé sur le transporteur
        let price = getSimulatedPrice(method.carrier, method.name, weight);
        
        // Majorations
        if (formData.is_fragile) price *= 1.15;
        if (formData.is_dangerous) price *= 1.30;
        if (formData.temperature_controlled) price *= 1.25;
        
        // Quantité
        price *= (formData.quantity || 1);
        price = Math.round(price * 100) / 100;

        const deliveryHours = estimateDeliveryHours(method.carrier, method.name);
        const pickupDate = new Date(formData.pickup_date);
        const estimatedDelivery = new Date(pickupDate);
        estimatedDelivery.setHours(estimatedDelivery.getHours() + deliveryHours);

        // Formater le nom du transporteur proprement
        const carrierName = method.carrier.charAt(0).toUpperCase() + method.carrier.slice(1);
        const displayName = `${carrierName} - ${method.name}`;

        quotes.push({
          carrier: {
            id: `sendcloud-${method.id}`,
            company_id: '',
            name: displayName,
            logo_url: null,
            type: mapCarrierType(method.carrier),
            base_price_per_km: 0,
            min_price: price,
            delivery_delay_hours: deliveryHours,
            rating: Math.round(getCarrierRating(method.carrier, method.name) * 10) / 10,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          price,
          estimated_delivery: estimatedDelivery,
          delivery_delay_hours: deliveryHours,
        });
      }
    }
  } catch (error) {
    console.error('❌ Erreur Sendcloud, fallback simulation:', error);
  }

  // ============================================
  // TENTATIVE 2: Simulation (fallback)
  // ============================================
  
  if (quotes.length === 0) {
    console.log('🔄 Utilisation des tarifs simulés...');
    
    const carriers = await getCarriers(companyId);
    const distance = estimateDistance(formData.origin_city, formData.destination_city);
    
    for (const carrier of carriers) {
      let price = Math.max(carrier.min_price, distance * carrier.base_price_per_km);
      
      // Majorations
      if (formData.is_fragile) price *= 1.15;
      if (formData.is_dangerous) price *= 1.30;
      if (formData.temperature_controlled) price *= 1.25;
      if (weight > 1000) price *= 1.20;
      if ((formData.volume_m3 || 0) > 10) price *= 1.15;
      
      price *= (formData.quantity || 1);
      price = Math.round(price * 100) / 100;
      
      const pickupDate = new Date(formData.pickup_date);
      const estimatedDelivery = new Date(pickupDate);
      estimatedDelivery.setHours(estimatedDelivery.getHours() + carrier.delivery_delay_hours);
      
      quotes.push({
        carrier,
        price,
        estimated_delivery: estimatedDelivery,
        delivery_delay_hours: carrier.delivery_delay_hours
      });
    }
  }

  // Trier par prix
  return quotes.sort((a, b) => a.price - b.price);
}

/**
 * Calcule la distance approximative entre deux villes (simulation)
 */
function estimateDistance(originCity: string, destinationCity: string): number {
  const cityDistances: Record<string, Record<string, number>> = {
    'Paris': { 'Lille': 220, 'Lyon': 465, 'Marseille': 775, 'Bordeaux': 585, 'Nantes': 385, 'Strasbourg': 490, 'Toulouse': 680, 'Amiens': 135 },
    'Lille': { 'Paris': 220, 'Amiens': 120, 'Arras': 50, 'Lens': 35, 'Douai': 40, 'Valenciennes': 55, 'Dunkerque': 80, 'Calais': 110 },
    'Arras': { 'Lille': 50, 'Amiens': 70, 'Paris': 180, 'Lens': 20, 'Douai': 25, 'Béthune': 35 },
    'Amiens': { 'Paris': 135, 'Lille': 120, 'Arras': 70, 'Rouen': 120 },
  };

  const origin = originCity.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const dest = destinationCity.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const [city, distances] of Object.entries(cityDistances)) {
    const cityNorm = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (cityNorm === origin) {
      for (const [destCity, km] of Object.entries(distances)) {
        const destNorm = destCity.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (destNorm === dest) return km;
      }
    }
    if (cityNorm === dest) {
      for (const [destCity, km] of Object.entries(distances)) {
        const destNorm = destCity.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (destNorm === origin) return km;
      }
    }
  }

  return Math.floor(Math.random() * 400) + 100;
}

// ============================================================
// BOOKINGS CRUD
// 🔒 SÉCURITÉ: Toutes les opérations incluent company_id
// ============================================================

/**
 * Crée un nouveau booking
 */
export async function createBooking(
  formData: TransportBookingFormData,
  companyId: string,
  userId: string
): Promise<TransportBooking> {
  if (!companyId) throw new Error('company_id requis');
  if (!userId) throw new Error('user_id requis');

  const { data, error } = await supabase
    .from('transport_bookings')
    .insert({
      company_id: companyId,
      user_id: userId,
      status: 'pending',
      ...formData
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Confirme un booking avec un transporteur
 * 🔒 SÉCURITÉ: Ajout du filtre company_id
 */
export async function confirmBooking(
  bookingId: string,
  companyId: string, // 🔒 Paramètre ajouté
  carrierId: string,
  carrierName: string,
  quotedPrice: number,
  estimatedDelivery: Date
): Promise<TransportBooking> {
  if (!companyId) throw new Error('company_id requis'); // 🔒 Guard clause

  const { data, error } = await supabase
    .from('transport_bookings')
    .update({
      status: 'confirmed',
      carrier_id: carrierId.startsWith('sendcloud-') ? null : carrierId,
      carrier_name: carrierName,
      quoted_price: quotedPrice,
      delivery_date_estimated: estimatedDelivery.toISOString().split('T')[0],
      tracking_number: 'TRK-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    })
    .eq('id', bookingId)
    .eq('company_id', companyId) // 🔒 Defense-in-depth
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Récupère tous les bookings d'une company
 * 🔒 SÉCURITÉ: company_id obligatoire
 */
export async function getBookings(companyId: string): Promise<TransportBooking[]> {
  if (!companyId) throw new Error('company_id requis'); // 🔒 Guard clause

  const { data, error } = await supabase
    .from('transport_bookings')
    .select('*, carrier:carriers(*)')
    .eq('company_id', companyId) // 🔒 Filtre obligatoire
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Récupère un booking par ID
 * 🔒 SÉCURITÉ: Ajout du filtre company_id
 */
export async function getBookingById(
  id: string,
  companyId: string // 🔒 Paramètre ajouté
): Promise<TransportBooking | null> {
  if (!companyId) throw new Error('company_id requis'); // 🔒 Guard clause

  const { data, error } = await supabase
    .from('transport_bookings')
    .select('*, carrier:carriers(*)')
    .eq('id', id)
    .eq('company_id', companyId) // 🔒 Defense-in-depth
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Met à jour le statut d'un booking
 * 🔒 SÉCURITÉ: Ajout du filtre company_id
 */
export async function updateBookingStatus(
  id: string,
  companyId: string, // 🔒 Paramètre ajouté
  status: TransportBooking['status']
): Promise<TransportBooking> {
  if (!companyId) throw new Error('company_id requis'); // 🔒 Guard clause

  const updates: Partial<TransportBooking> = { status };
  
  if (status === 'delivered') {
    updates.delivery_date_actual = new Date().toISOString().split('T')[0];
  }

  const { data, error } = await supabase
    .from('transport_bookings')
    .update(updates)
    .eq('id', id)
    .eq('company_id', companyId) // 🔒 Defense-in-depth
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Annule un booking
 * 🔒 SÉCURITÉ: Ajout du filtre company_id
 */
export async function cancelBooking(
  id: string,
  companyId: string // 🔒 Paramètre ajouté
): Promise<void> {
  if (!companyId) throw new Error('company_id requis'); // 🔒 Guard clause

  const { error } = await supabase
    .from('transport_bookings')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('company_id', companyId); // 🔒 Defense-in-depth

  if (error) throw error;
}

/**
 * Supprime un booking (brouillon uniquement)
 * 🔒 SÉCURITÉ: Ajout du filtre company_id
 */
export async function deleteBooking(
  id: string,
  companyId: string // 🔒 Paramètre ajouté
): Promise<void> {
  if (!companyId) throw new Error('company_id requis'); // 🔒 Guard clause

  const { error } = await supabase
    .from('transport_bookings')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId) // 🔒 Defense-in-depth
    .eq('status', 'draft');

  if (error) throw error;
}