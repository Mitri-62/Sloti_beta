// src/services/errorService.ts
import { toast } from 'sonner';

/**
 * Codes d'erreur standardisés pour l'application
 */
export enum ErrorCode {
  NETWORK = 'NETWORK_ERROR',
  AUTH = 'AUTH_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION = 'PERMISSION_DENIED',
  CONFLICT = 'CONFLICT',
  OFFLINE = 'OFFLINE_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * Classe d'erreur personnalisée avec contexte supplémentaire
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public meta?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintenir la stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Messages d'erreur user-friendly par code
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK]: 'Problème de connexion au serveur',
  [ErrorCode.AUTH]: 'Session expirée, veuillez vous reconnecter',
  [ErrorCode.VALIDATION]: 'Données invalides',
  [ErrorCode.NOT_FOUND]: 'Ressource introuvable',
  [ErrorCode.PERMISSION]: 'Vous n\'avez pas les permissions nécessaires',
  [ErrorCode.CONFLICT]: 'Cette opération entre en conflit avec des données existantes',
  [ErrorCode.OFFLINE]: 'Mode hors ligne - les données seront synchronisées plus tard',
  [ErrorCode.UNKNOWN]: 'Une erreur inattendue est survenue',
};

/**
 * Service centralisé de gestion des erreurs
 */
class ErrorService {
  /**
   * Gère toutes les erreurs de l'application
   */
  handle(error: unknown, context?: string): void {
    const appError = this.normalizeError(error);
    
    // Logger l'erreur
    this.logError(appError, context);
    
    // Notifier l'utilisateur
    this.notifyUser(appError);
    
    // Envoyer à un service de monitoring (Sentry, etc.)
    this.reportToMonitoring(appError, context);
  }

  /**
   * Convertit n'importe quelle erreur en AppError
   * ✅ RENDU PUBLIC pour être utilisé par safely()
   */
  public normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Erreurs Supabase
      if ('code' in error) {
        return this.handleSupabaseError(error as any);
      }

      // Erreurs réseau
      if (error.message.includes('fetch')) {
        return new AppError(
          'Impossible de contacter le serveur',
          ErrorCode.NETWORK
        );
      }

      return new AppError(error.message, ErrorCode.UNKNOWN);
    }

    // Erreur inconnue
    return new AppError(
      'Une erreur inconnue est survenue',
      ErrorCode.UNKNOWN,
      { originalError: error }
    );
  }

  /**
   * Gère spécifiquement les erreurs Supabase
   */
  private handleSupabaseError(error: any): AppError {
    const code = error.code;
    const message = error.message || '';

    // Erreurs de validation
    if (code === '23505') {
      return new AppError(
        'Cet élément existe déjà',
        ErrorCode.CONFLICT,
        { postgresCode: code }
      );
    }

    // Erreurs de permission
    if (code === 'PGRST301' || message.includes('permission')) {
      return new AppError(
        'Vous n\'avez pas les droits nécessaires',
        ErrorCode.PERMISSION,
        { postgresCode: code }
      );
    }

    // Erreurs d'authentification
    if (code === 'PGRST301' || message.includes('JWT')) {
      return new AppError(
        'Votre session a expiré',
        ErrorCode.AUTH,
        { postgresCode: code }
      );
    }

    // Not found
    if (code === 'PGRST116') {
      return new AppError(
        'Ressource introuvable',
        ErrorCode.NOT_FOUND,
        { postgresCode: code }
      );
    }

    // Mode hors ligne
    if (message.includes('Failed to fetch')) {
      return new AppError(
        'Mode hors ligne actif',
        ErrorCode.OFFLINE
      );
    }

    return new AppError(
      message || 'Erreur de base de données',
      ErrorCode.UNKNOWN,
      { postgresCode: code }
    );
  }

  /**
   * Log l'erreur dans la console avec contexte
   */
  private logError(error: AppError, context?: string): void {
    const logData = {
      code: error.code,
      message: error.message,
      context,
      meta: error.meta,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    console.error('❌ Application Error:', logData);
  }

  /**
   * Notifie l'utilisateur via toast
   */
  private notifyUser(error: AppError): void {
    // Ne pas notifier les erreurs offline (déjà géré par OfflineIndicator)
    if (error.code === ErrorCode.OFFLINE) {
      return;
    }

    const message = error.message || ERROR_MESSAGES[error.code];
    
    // Utiliser différents types de toast selon la sévérité
    if (error.code === ErrorCode.AUTH) {
      toast.error(message, {
        duration: 6000,
        action: {
          label: 'Reconnecter',
          onClick: () => window.location.href = '/login',
        },
      });
    } else if (error.code === ErrorCode.VALIDATION) {
      toast.warning(message, { duration: 4000 });
    } else {
      toast.error(message, { duration: 5000 });
    }
  }

  /**
   * Envoie l'erreur à un service de monitoring externe
   */
  private reportToMonitoring(error: AppError, context?: string): void {
    // En production, envoyer à Sentry ou autre service
    if (import.meta.env.PROD) {
      // Sentry.captureException(error, { extra: { context, meta: error.meta } });
      console.log('📊 Would send to monitoring:', { error, context });
    }
  }

  /**
   * Créer une erreur de validation avec des détails de champs
   */
  validation(message: string, fields?: Record<string, string>): AppError {
    return new AppError(message, ErrorCode.VALIDATION, { fields });
  }

  /**
   * Créer une erreur d'authentification
   */
  auth(message: string = 'Non authentifié'): AppError {
    return new AppError(message, ErrorCode.AUTH);
  }

  /**
   * Créer une erreur de permission
   */
  permission(message: string = 'Accès refusé'): AppError {
    return new AppError(message, ErrorCode.PERMISSION);
  }

  /**
   * Créer une erreur réseau
   */
  network(message: string = 'Erreur de connexion'): AppError {
    return new AppError(message, ErrorCode.NETWORK);
  }
}

// Instance singleton
export const errorService = new ErrorService();

/**
 * Wrapper pour les fonctions async avec gestion d'erreur automatique
 * @example
 * const result = await withErrorHandling(
 *   async () => supabase.from('users').select(),
 *   'Chargement utilisateurs'
 * );
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    errorService.handle(error, context);
    return null;
  }
}

/**
 * Helper pour les try-catch plus lisibles
 * ✅ CORRIGÉ : Ne plus appeler la méthode normalizeError
 * 
 * @example
 * const [error, data] = await safely(() => fetchData());
 * if (error) return;
 */
export async function safely<T>(
  fn: () => Promise<T>
): Promise<[AppError | null, T | null]> {
  try {
    const result = await fn();
    return [null, result];
  } catch (error) {
    // ✅ Utilisation de la méthode publique normalizeError
    const appError = errorService.normalizeError(error);
    return [appError, null];
  }
}