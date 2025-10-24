// src/constants/dock.constants.ts
/**
 * Constantes, enums et helpers pour la gestion des quais
 */

import { DockType, DockStatus, BookingStatus } from '../types/dock.types';

// ============================================================
// LABELS FRANÇAIS
// ============================================================

export const DOCK_TYPE_LABELS: Record<DockType, string> = {
  loading: 'Chargement',
  unloading: 'Déchargement',
  both: 'Chargement & Déchargement'
};

export const DOCK_STATUS_LABELS: Record<DockStatus, string> = {
  available: 'Disponible',
  occupied: 'Occupé',
  maintenance: 'En maintenance',
  closed: 'Fermé'
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  requested: 'En attente',
  confirmed: 'Confirmé',
  in_progress: 'En cours',
  completed: 'Terminé',
  cancelled: 'Annulé',
  no_show: 'Absent'
};

// ============================================================
// COULEURS POUR L'UI
// ============================================================

export const DOCK_STATUS_COLORS: Record<DockStatus, { bg: string; text: string; border: string }> = {
  available: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300'
  },
  occupied: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300'
  },
  maintenance: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300'
  },
  closed: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300'
  }
};

export const BOOKING_STATUS_COLORS: Record<BookingStatus, { bg: string; text: string; border: string; hex: string }> = {
  requested: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    hex: '#9CA3AF'
  },
  confirmed: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    hex: '#3B82F6'
  },
  in_progress: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300',
    hex: '#F59E0B'
  },
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    hex: '#10B981'
  },
  cancelled: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    hex: '#EF4444'
  },
  no_show: {
    bg: 'bg-red-200',
    text: 'text-red-900',
    border: 'border-red-400',
    hex: '#DC2626'
  }
};

export const DOCK_TYPE_COLORS: Record<DockType, { bg: string; text: string; hex: string }> = {
  loading: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    hex: '#3B82F6'
  },
  unloading: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    hex: '#8B5CF6'
  },
  both: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    hex: '#6366F1'
  }
};

// ============================================================
// ICÔNES LUCIDE-REACT
// ============================================================

export const DOCK_TYPE_ICONS: Record<DockType, string> = {
  loading: 'PackageCheck',
  unloading: 'Truck',
  both: 'ArrowLeftRight'
};

export const DOCK_STATUS_ICONS: Record<DockStatus, string> = {
  available: 'CheckCircle',
  occupied: 'Clock',
  maintenance: 'Wrench',
  closed: 'XCircle'
};

export const BOOKING_STATUS_ICONS: Record<BookingStatus, string> = {
  requested: 'Clock',
  confirmed: 'CheckCircle',
  in_progress: 'Loader',
  completed: 'CheckCheck',
  cancelled: 'XCircle',
  no_show: 'AlertTriangle'
};

// ============================================================
// CONFIGURATION PAR DÉFAUT
// ============================================================

export const DEFAULT_SLOT_DURATIONS = {
  loading: 120,
  unloading: 90,
  both: 120
};

export const DEFAULT_OPENING_HOURS = {
  start: '06:00',
  end: '22:00'
};

export const SLOT_INTERVAL_MINUTES = 30;
export const DEFAULT_PLANNING_DAYS = 7;
export const MIN_CANCELLATION_DELAY_MINUTES = 120;
export const MAX_BOOKINGS_PER_DOCK_PER_DAY = 10;

// ============================================================
// HELPERS & UTILS
// ============================================================

export function getBookingStatusColor(status: BookingStatus): string {
  return BOOKING_STATUS_COLORS[status].hex;
}

export function getBookingStatusLabel(status: BookingStatus): string {
  return BOOKING_STATUS_LABELS[status];
}

export function canEditBooking(status: BookingStatus): boolean {
  return ['requested', 'confirmed'].includes(status);
}

export function canCancelBooking(status: BookingStatus): boolean {
  return ['requested', 'confirmed'].includes(status);
}

export function isBookingFinished(status: BookingStatus): boolean {
  return ['completed', 'cancelled', 'no_show'].includes(status);
}

export function isBookingActive(status: BookingStatus): boolean {
  return ['confirmed', 'in_progress'].includes(status);
}

export function calculateDurationMinutes(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

export function generateBookingTitle(
  transporterName: string,
  vehiclePlate?: string | null
): string {
  if (vehiclePlate) {
    return `${transporterName} - ${vehiclePlate}`;
  }
  return transporterName;
}

export function getNextBookingStatus(currentStatus: BookingStatus): BookingStatus | null {
  const statusFlow: Record<BookingStatus, BookingStatus | null> = {
    requested: 'confirmed',
    confirmed: 'in_progress',
    in_progress: 'completed',
    completed: null,
    cancelled: null,
    no_show: null
  };
  
  return statusFlow[currentStatus];
}

export function doSlotsOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

export function generateDaySlots(
  date: Date,
  durationMinutes: number = 120,
  openingHour: string = '06:00',
  closingHour: string = '22:00'
): Array<{ start: Date; end: Date }> {
  const slots: Array<{ start: Date; end: Date }> = [];
  
  const [openHour, openMin] = openingHour.split(':').map(Number);
  const [closeHour, closeMin] = closingHour.split(':').map(Number);
  
  const currentSlot = new Date(date);
  currentSlot.setHours(openHour, openMin, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(closeHour, closeMin, 0, 0);
  
  while (currentSlot < endOfDay) {
    const slotEnd = new Date(currentSlot.getTime() + durationMinutes * 60000);
    
    if (slotEnd <= endOfDay) {
      slots.push({
        start: new Date(currentSlot),
        end: slotEnd
      });
    }
    
    currentSlot.setTime(currentSlot.getTime() + SLOT_INTERVAL_MINUTES * 60000);
  }
  
  return slots;
}

export function isValidFrenchPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, '');
  return /^(?:(?:\+|00)33|0)[1-9](?:\d{8})$/.test(cleaned);
}

export function formatFrenchPhone(phone: string): string {
  const cleaned = phone.replace(/[\s.-]/g, '');
  if (cleaned.startsWith('+33')) {
    return cleaned.replace(/(\+33)(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6');
  }
  if (cleaned.startsWith('0')) {
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  return phone;
}

export function isValidFrenchPlate(plate: string): boolean {
  return /^[A-Z]{2}-\d{3}-[A-Z]{2}$|^\d{4}-[A-Z]{2}-\d{2}$/.test(plate.toUpperCase());
}

// ============================================================
// EXPORT DES LISTES POUR LES SELECTS
// ============================================================

export const DOCK_TYPE_OPTIONS: Array<{ value: DockType; label: string }> = [
  { value: 'loading', label: DOCK_TYPE_LABELS.loading },
  { value: 'unloading', label: DOCK_TYPE_LABELS.unloading },
  { value: 'both', label: DOCK_TYPE_LABELS.both }
];

export const DOCK_STATUS_OPTIONS: Array<{ value: DockStatus; label: string }> = [
  { value: 'available', label: DOCK_STATUS_LABELS.available },
  { value: 'occupied', label: DOCK_STATUS_LABELS.occupied },
  { value: 'maintenance', label: DOCK_STATUS_LABELS.maintenance },
  { value: 'closed', label: DOCK_STATUS_LABELS.closed }
];

export const BOOKING_STATUS_OPTIONS: Array<{ value: BookingStatus; label: string }> = [
  { value: 'requested', label: BOOKING_STATUS_LABELS.requested },
  { value: 'confirmed', label: BOOKING_STATUS_LABELS.confirmed },
  { value: 'in_progress', label: BOOKING_STATUS_LABELS.in_progress },
  { value: 'completed', label: BOOKING_STATUS_LABELS.completed },
  { value: 'cancelled', label: BOOKING_STATUS_LABELS.cancelled },
  { value: 'no_show', label: BOOKING_STATUS_LABELS.no_show }
];