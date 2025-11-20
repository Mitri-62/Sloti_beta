// ========================================
// 🚚 CODE À AJOUTER DANS TON APP
// ========================================

// src/services/tourTokenService.ts
import { supabase } from '../supabaseClient';

/**
 * Génère un token d'accès sécurisé pour une tournée
 * À utiliser côté admin pour partager l'accès à l'app chauffeur
 */
export async function generateTourAccessToken(
  tourId: string,
  expiryHours: number = 24
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('generate_tour_access_token', {
      p_tour_id: tourId,
      p_expiry_hours: expiryHours
    });

    if (error) throw error;
    
    console.log('✅ Token généré:', data);
    return data;
  } catch (error) {
    console.error('❌ Erreur génération token:', error);
    return null;
  }
}

/**
 * Révoque un token d'accès
 */
export async function revokeTourAccessToken(token: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('revoke_tour_access_token', {
      p_token: token
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('❌ Erreur révocation token:', error);
    return false;
  }
}

/**
 * Créer un lien sécurisé pour l'app chauffeur
 */
export function generateDriverAppLink(tourId: string, token: string): string {
  const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin;
  return `${baseUrl}/app/driver-app/${tourId}?token=${token}`;
}