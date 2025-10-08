import { format, parse, isValid, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDate = (date: string | Date): string => {
  // Si c'est une chaîne de caractères, on la parse d'abord
  const parsedDate = typeof date === 'string' 
    ? parseWithTimezone(date)
    : date;
  return format(parsedDate, 'dd MMMM yyyy', { locale: fr });
};

export const formatTime = (hour: number, minutes: number = 0): string => {
  return `${hour.toString().padStart(2, '0')}h${minutes.toString().padStart(2, '0')}`;
};

export const parseDate = (dateString: string): Date | null => {
  const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : null;
};

export const getNextDay = (date: string): string => {
  const parsed = parseDate(date);
  if (!parsed) return date;
  return format(addDays(parsed, 1), 'yyyy-MM-dd');
};

export const getPreviousDay = (date: string): string => {
  const parsed = parseDate(date);
  if (!parsed) return date;
  return format(subDays(parsed, 1), 'yyyy-MM-dd');
};

// Nouvelle fonction pour gérer correctement le fuseau horaire
export const parseWithTimezone = (dateString: string): Date => {
  // On s'assure d'avoir une date au format YYYY-MM-DD
  const [year, month, day] = dateString.split('-').map(Number);
  
  // On crée une nouvelle date en utilisant UTC pour éviter les problèmes de fuseau horaire
  const date = new Date(Date.UTC(year, month - 1, day));
  
  // On ajuste pour le fuseau horaire local
  const offset = date.getTimezoneOffset();
  date.setMinutes(date.getMinutes() - offset);
  
  return date;
};