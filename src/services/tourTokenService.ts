// src/services/tourTokenService.ts
// 🔒 SÉCURITÉ: Defense-in-depth avec paramètre companyId sur toutes les opérations

import { supabase } from '../supabaseClient';

/**
 * Génère un token d'accès sécurisé pour une tournée
 * À utiliser côté admin pour partager l'accès à l'app chauffeur
 * 
 * 🔒 SÉCURITÉ: Le companyId est passé pour validation côté RPC
 * 
 * @param tourId - ID de la tournée
 * @param companyId - ID de l'entreprise (obligatoire pour validation)
 * @param expiryHours - Durée de validité du token en heures (défaut: 24h)
 */
export async function generateTourAccessToken(
  tourId: string,
  companyId: string, // 🔒 Paramètre ajouté
  expiryHours: number = 24
): Promise<string | null> {
  // 🔒 Guard clause
  if (!companyId) {
    console.error('❌ company_id requis pour générer un token');
    return null;
  }

  if (!tourId) {
    console.error('❌ tour_id requis pour générer un token');
    return null;
  }

  try {
    // 🔒 SÉCURITÉ: Vérifier d'abord que la tournée appartient à la company
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('id')
      .eq('id', tourId)
      .eq('company_id', companyId) // 🔒 Defense-in-depth
      .single();

    if (tourError || !tour) {
      console.error('❌ Tournée non trouvée ou accès refusé');
      return null;
    }

    // Appeler la RPC avec le company_id pour double validation
    const { data, error } = await supabase.rpc('generate_tour_access_token', {
      p_tour_id: tourId,
      p_expiry_hours: expiryHours,
      p_company_id: companyId // 🔒 Defense-in-depth (si la RPC le supporte)
    });

    if (error) {
      // Fallback si la RPC ne supporte pas encore p_company_id
      if (error.message.includes('p_company_id')) {
        console.warn('⚠️ RPC ne supporte pas p_company_id, utilisation sans');
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('generate_tour_access_token', {
          p_tour_id: tourId,
          p_expiry_hours: expiryHours
        });
        
        if (fallbackError) throw fallbackError;
        console.log('✅ Token généré (fallback):', fallbackData);
        return fallbackData;
      }
      throw error;
    }
    
    console.log('✅ Token généré:', data);
    return data;
  } catch (error) {
    console.error('❌ Erreur génération token:', error);
    return null;
  }
}

/**
 * Révoque un token d'accès
 * 
 * 🔒 SÉCURITÉ: Le companyId est passé pour validation côté RPC
 * 
 * @param token - Token à révoquer
 * @param companyId - ID de l'entreprise (obligatoire pour validation)
 */
export async function revokeTourAccessToken(
  token: string,
  companyId: string // 🔒 Paramètre ajouté
): Promise<boolean> {
  // 🔒 Guard clause
  if (!companyId) {
    console.error('❌ company_id requis pour révoquer un token');
    return false;
  }

  if (!token) {
    console.error('❌ token requis pour la révocation');
    return false;
  }

  try {
    // 🔒 SÉCURITÉ: Vérifier que le token appartient à une tournée de la company
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('id')
      .eq('access_token', token)
      .eq('company_id', companyId) // 🔒 Defense-in-depth
      .single();

    if (tourError || !tour) {
      console.error('❌ Token non trouvé ou accès refusé');
      return false;
    }

    const { data, error } = await supabase.rpc('revoke_tour_access_token', {
      p_token: token,
      p_company_id: companyId // 🔒 Defense-in-depth (si la RPC le supporte)
    });

    if (error) {
      // Fallback si la RPC ne supporte pas encore p_company_id
      if (error.message.includes('p_company_id')) {
        console.warn('⚠️ RPC ne supporte pas p_company_id, utilisation sans');
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('revoke_tour_access_token', {
          p_token: token
        });
        
        if (fallbackError) throw fallbackError;
        return fallbackData === true;
      }
      throw error;
    }

    return data === true;
  } catch (error) {
    console.error('❌ Erreur révocation token:', error);
    return false;
  }
}

/**
 * Vérifie si un token est valide et non expiré
 * 
 * @param tourId - ID de la tournée
 * @param token - Token à vérifier
 */
export async function verifyTourAccessToken(
  tourId: string,
  token: string
): Promise<boolean> {
  if (!tourId || !token) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('tours')
      .select('access_token, token_expires_at')
      .eq('id', tourId)
      .single();

    if (error || !data) {
      return false;
    }

    // Vérifier que le token correspond
    if (data.access_token !== token) {
      return false;
    }

    // Vérifier que le token n'est pas expiré
    if (data.token_expires_at) {
      const expiryDate = new Date(data.token_expires_at);
      if (expiryDate < new Date()) {
        console.warn('⚠️ Token expiré');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur vérification token:', error);
    return false;
  }
}

/**
 * Créer un lien sécurisé pour l'app chauffeur
 * 
 * @param tourId - ID de la tournée
 * @param token - Token d'accès
 */
export function generateDriverAppLink(tourId: string, token: string): string {
  const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin;
  return `${baseUrl}/app/driver-app/${tourId}?token=${token}`;
}

/**
 * Génère un token et retourne directement le lien complet
 * 
 * 🔒 SÉCURITÉ: Combine génération de token et création de lien
 * 
 * @param tourId - ID de la tournée
 * @param companyId - ID de l'entreprise (obligatoire)
 * @param expiryHours - Durée de validité en heures
 */
export async function generateDriverAppLinkWithToken(
  tourId: string,
  companyId: string, // 🔒 Paramètre obligatoire
  expiryHours: number = 48
): Promise<{ link: string; token: string; expiresAt: Date } | null> {
  // 🔒 Guard clause
  if (!companyId) {
    console.error('❌ company_id requis');
    return null;
  }

  const token = await generateTourAccessToken(tourId, companyId, expiryHours);
  
  if (!token) {
    return null;
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiryHours);

  return {
    link: generateDriverAppLink(tourId, token),
    token,
    expiresAt
  };
}

/**
 * Rafraîchit un token existant (prolonge son expiration)
 * 
 * 🔒 SÉCURITÉ: Le companyId est passé pour validation
 * 
 * @param tourId - ID de la tournée
 * @param companyId - ID de l'entreprise (obligatoire)
 * @param additionalHours - Heures à ajouter à l'expiration actuelle
 */
export async function refreshTourAccessToken(
  tourId: string,
  companyId: string, // 🔒 Paramètre obligatoire
  additionalHours: number = 24
): Promise<string | null> {
  // 🔒 Guard clause
  if (!companyId) {
    console.error('❌ company_id requis pour rafraîchir un token');
    return null;
  }

  try {
    // 🔒 SÉCURITÉ: Vérifier que la tournée appartient à la company
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('access_token, token_expires_at')
      .eq('id', tourId)
      .eq('company_id', companyId) // 🔒 Defense-in-depth
      .single();

    if (tourError || !tour) {
      console.error('❌ Tournée non trouvée ou accès refusé');
      return null;
    }

    // Si pas de token existant, en générer un nouveau
    if (!tour.access_token) {
      return generateTourAccessToken(tourId, companyId, additionalHours);
    }

    // Calculer la nouvelle date d'expiration
    const currentExpiry = tour.token_expires_at 
      ? new Date(tour.token_expires_at) 
      : new Date();
    
    const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));
    newExpiry.setHours(newExpiry.getHours() + additionalHours);

    // 🔒 SÉCURITÉ: Mettre à jour avec filtre company_id
    const { error: updateError } = await supabase
      .from('tours')
      .update({ token_expires_at: newExpiry.toISOString() })
      .eq('id', tourId)
      .eq('company_id', companyId); // 🔒 Defense-in-depth

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Token rafraîchi, nouvelle expiration:', newExpiry);
    return tour.access_token;
  } catch (error) {
    console.error('❌ Erreur rafraîchissement token:', error);
    return null;
  }
}