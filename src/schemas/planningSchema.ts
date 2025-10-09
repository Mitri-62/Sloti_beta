// src/schemas/planningSchema.ts
import { z } from 'zod';

/**
 * Schéma de validation pour les événements de planning
 * Assure la cohérence et la sécurité des données
 */
export const planningSchema = z.object({
  // Date au format YYYY-MM-DD
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide (YYYY-MM-DD)")
    .refine((dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }, "Date invalide"),

  // Heure au format HH:MM
  hour: z.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Format d'heure invalide (HH:MM)"),

  // Type d'événement
  type: z.enum(["Réception", "Expédition"], {
    errorMap: () => ({ message: "Type doit être 'Réception' ou 'Expédition'" }),
  }),

  // Transporteur (requis, min 2 caractères)
  transporter: z.string()
    .trim()
    .min(2, "Le transporteur doit contenir au moins 2 caractères")
    .max(100, "Le transporteur ne peut pas dépasser 100 caractères"),

  // Produits (optionnel)
  products: z.string()
    .max(500, "La description des produits ne peut pas dépasser 500 caractères")
    .optional()
    .or(z.literal("")),

  // Statut
  status: z.enum(["Prévu", "En cours", "Chargé", "Terminé"], {
    errorMap: () => ({ message: "Statut invalide" }),
  }),

  // Durée en minutes (optionnel, par défaut 30)
  duration: z.number()
    .int("La durée doit être un nombre entier")
    .positive("La durée doit être positive")
    .max(480, "La durée ne peut pas dépasser 8 heures (480 minutes)")
    .optional()
    .default(30),

  // Champ forecast (optionnel)
  is_forecast: z.boolean().optional().default(false),
});

/**
 * Schéma partiel pour les mises à jour
 * Tous les champs deviennent optionnels
 */
export const planningUpdateSchema = planningSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Au moins un champ doit être fourni pour la mise à jour" }
);

/**
 * Type TypeScript inféré depuis le schéma
 */
export type PlanningInput = z.infer<typeof planningSchema>;
export type PlanningUpdateInput = z.infer<typeof planningUpdateSchema>;

/**
 * Validation avec messages d'erreur formatés
 */
export function validatePlanning(data: unknown) {
  const result = planningSchema.safeParse(data);
  
  if (!result.success) {
    // Formater les erreurs pour l'UI
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    return {
      success: false as const,
      errors,
      message: errors[0]?.message || "Données invalides",
    };
  }
  
  return {
    success: true as const,
    data: result.data,
  };
}

/**
 * Validation pour les mises à jour partielles
 */
export function validatePlanningUpdate(data: unknown) {
  const result = planningUpdateSchema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    return {
      success: false as const,
      errors,
      message: errors[0]?.message || "Données de mise à jour invalides",
    };
  }
  
  return {
    success: true as const,
    data: result.data,
  };
}

/**
 * Validation des dates (s'assurer que la date n'est pas dans le passé pour les nouveaux événements)
 */
export function validateEventDateTime(date: string, hour: string, allowPast = false) {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = hour.split(':').map(Number);
  
  const eventDate = new Date(year, month - 1, day, hours, minutes);
  const now = new Date();
  
  if (!allowPast && eventDate < now) {
    return {
      success: false as const,
      message: "La date et l'heure ne peuvent pas être dans le passé",
    };
  }
  
  return {
    success: true as const,
    date: eventDate,
  };
}