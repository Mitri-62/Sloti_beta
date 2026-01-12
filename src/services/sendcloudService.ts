// src/services/sendcloudService.ts
// Service pour l'intégration Sendcloud via Edge Function
// 🔒 Les appels passent par Supabase Edge Function (clés sécurisées côté serveur)

import { supabase } from '../supabaseClient';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sendcloud-api`;

interface ShippingRate {
  id: number;
  name: string;
  carrier: string;
  price: number | null;
  min_weight: number;
  max_weight: number;
  delivery_days: number | null;
  tracking: boolean;
}

interface GetRatesParams {
  from_postal_code: string;
  from_country?: string;
  to_postal_code: string;
  to_country?: string;
  weight: number; // en kg
  length?: number;
  width?: number;
  height?: number;
}

interface CreateParcelParams {
  to_name: string;
  to_company?: string;
  to_address: string;
  to_house_number?: string;
  to_city: string;
  to_postal_code: string;
  to_country?: string;
  to_phone?: string;
  to_email?: string;
  shipping_method_id: number;
  weight: number; // en kg
  reference?: string;
  request_label?: boolean;
}

interface ParcelResponse {
  parcel: {
    id: number;
    tracking_number: string;
    carrier: { code: string };
    status: { id: number; message: string };
    label?: {
      label_printer: string;
      normal_printer: string;
    };
  };
}

/**
 * Récupère le token d'authentification Supabase
 */
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

/**
 * Appelle l'Edge Function Sendcloud
 */
async function callEdgeFunction(
  action: string, 
  method: 'GET' | 'POST' = 'GET',
  body?: any,
  params?: Record<string, string>
): Promise<any> {
  const token = await getAuthToken();
  
  let url = `${EDGE_FUNCTION_URL}?action=${action}`;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url += `&${key}=${encodeURIComponent(value)}`;
    });
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================
// FONCTIONS PUBLIQUES
// ============================================================

/**
 * Récupère toutes les méthodes d'expédition disponibles
 */
export async function getShippingMethods(): Promise<any[]> {
  const data = await callEdgeFunction('shipping-methods');
  return data.shipping_methods || [];
}

/**
 * Calcule les tarifs pour une expédition
 */
export async function getShippingRates(params: GetRatesParams): Promise<ShippingRate[]> {
  const data = await callEdgeFunction('get-rates', 'POST', {
    from_postal_code: params.from_postal_code,
    from_country: params.from_country || 'FR',
    to_postal_code: params.to_postal_code,
    to_country: params.to_country || 'FR',
    weight: params.weight,
    length: params.length,
    width: params.width,
    height: params.height,
  });
  
  return data.rates || [];
}

/**
 * Crée une expédition et génère l'étiquette
 */
export async function createParcel(params: CreateParcelParams): Promise<ParcelResponse> {
  const data = await callEdgeFunction('create-parcel', 'POST', params);
  return data;
}

/**
 * Récupère le statut d'un colis
 */
export async function trackParcel(parcelId: string): Promise<any> {
  const data = await callEdgeFunction('track', 'GET', undefined, { parcel_id: parcelId });
  return data.parcel;
}

/**
 * Récupère l'URL de l'étiquette
 */
export async function getLabelUrl(parcelId: string): Promise<string> {
  const data = await callEdgeFunction('label', 'GET', undefined, { parcel_id: parcelId });
  return data.label_url;
}

// ============================================================
// HELPERS POUR LE MODULE BOOKING
// ============================================================

/**
 * Convertit les rates Sendcloud en format CarrierQuote pour le module Booking
 */
export function convertToCarrierQuotes(
  rates: ShippingRate[], 
  pickupDate: Date
): Array<{
  carrier: {
    id: string;
    name: string;
    type: string;
    rating: number;
  };
  price: number;
  delivery_delay_hours: number;
  estimated_delivery: Date;
}> {
  return rates
    .filter(rate => rate.price !== null)
    .map(rate => {
      const deliveryDays = rate.delivery_days || 3;
      const deliveryDelayHours = deliveryDays * 24;
      const estimatedDelivery = new Date(pickupDate);
      estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);

      // Déterminer le type basé sur le délai
      let type = 'standard';
      if (deliveryDays <= 1) type = 'express';
      else if (deliveryDays >= 4) type = 'economique';

      // Note fictive basée sur le transporteur
      const ratings: Record<string, number> = {
        'colissimo': 4.2,
        'chronopost': 4.5,
        'dhl': 4.6,
        'ups': 4.4,
        'gls': 4.1,
        'mondial_relay': 4.0,
        'dpd': 4.2,
        'fedex': 4.5,
      };
      const carrierCode = rate.carrier?.toLowerCase() || '';
      const rating = ratings[carrierCode] || 4.0;

      return {
        carrier: {
          id: rate.id.toString(),
          name: rate.name || rate.carrier,
          type,
          rating,
        },
        price: rate.price!,
        delivery_delay_hours: deliveryDelayHours,
        estimated_delivery: estimatedDelivery,
      };
    })
    .sort((a, b) => a.price - b.price); // Trier par prix croissant
}

/**
 * Récupère les vrais devis Sendcloud pour une demande de transport
 */
export async function getRealQuotes(
  originPostalCode: string,
  destinationPostalCode: string,
  weightKg: number,
  pickupDate: Date,
  originCountry = 'FR',
  destinationCountry = 'FR'
) {
  try {
    const rates = await getShippingRates({
      from_postal_code: originPostalCode,
      from_country: originCountry,
      to_postal_code: destinationPostalCode,
      to_country: destinationCountry,
      weight: weightKg,
    });

    return convertToCarrierQuotes(rates, pickupDate);
  } catch (error) {
    console.error('Erreur récupération devis Sendcloud:', error);
    throw error;
  }
}