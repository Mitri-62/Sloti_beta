// src/vitrine/pages/admin/BookingsAdmin.tsx
// Page admin pour gérer les RDV de démo
import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { 
  Calendar, Clock, User, Building2, Mail, Phone, 
  Check, X, Loader2, ArrowLeft, RefreshCw 
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DemoBooking {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  source: string;
  created_at: string;
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmé', color: 'bg-green-100 text-green-800', icon: Check },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: X },
  completed: { label: 'Terminé', color: 'bg-blue-100 text-blue-800', icon: Check },
};

export default function BookingsAdmin() {
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('demo_bookings')
        .select('*')
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Erreur chargement RDV:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: DemoBooking['status']) => {
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'confirmed') {
        updates.confirmed_at = new Date().toISOString();
      } else if (newStatus === 'cancelled') {
        updates.cancelled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('demo_bookings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      // Mettre à jour localement
      setBookings(prev => prev.map(b => 
        b.id === id ? { ...b, status: newStatus } : b
      ));
    } catch (err) {
      console.error('Erreur mise à jour:', err);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') {
      const bookingDate = new Date(b.booking_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return bookingDate >= today && b.status !== 'cancelled';
    }
    return b.status === filter;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5).replace(':', 'h');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  RDV de démo
                </h1>
                <p className="text-sm text-gray-500">
                  {bookings.filter(b => b.status === 'pending').length} en attente
                </p>
              </div>
            </div>
            <button
              onClick={loadBookings}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: bookings.length, color: 'bg-gray-100' },
            { label: 'En attente', value: bookings.filter(b => b.status === 'pending').length, color: 'bg-yellow-100' },
            { label: 'Confirmés', value: bookings.filter(b => b.status === 'confirmed').length, color: 'bg-green-100' },
            { label: 'Cette semaine', value: bookings.filter(b => {
              const d = new Date(b.booking_date);
              const now = new Date();
              const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              return d >= now && d <= weekFromNow;
            }).length, color: 'bg-cyan-100' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-lg p-4`}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'Tous' },
            { key: 'upcoming', label: 'À venir' },
            { key: 'pending', label: 'En attente' },
            { key: 'confirmed', label: 'Confirmés' },
            { key: 'completed', label: 'Terminés' },
            { key: 'cancelled', label: 'Annulés' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-cyan-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Liste des RDV */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucun RDV {filter !== 'all' ? 'dans cette catégorie' : ''}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const StatusIcon = STATUS_CONFIG[booking.status].icon;
              const isPast = new Date(booking.booking_date) < new Date(new Date().toDateString());
              
              return (
                <div 
                  key={booking.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 ${
                    isPast && booking.status !== 'completed' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Date/Heure */}
                    <div className="flex items-center gap-3 md:w-48">
                      <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-cyan-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatDate(booking.booking_date)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatTime(booking.booking_time)}
                        </p>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {booking.name}
                        </span>
                        {booking.company && (
                          <>
                            <Building2 className="w-4 h-4 text-gray-400 ml-2" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {booking.company}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <a href={`mailto:${booking.email}`} className="flex items-center gap-1 hover:text-cyan-600">
                          <Mail className="w-4 h-4" />
                          {booking.email}
                        </a>
                        {booking.phone && (
                          <a href={`tel:${booking.phone}`} className="flex items-center gap-1 hover:text-cyan-600">
                            <Phone className="w-4 h-4" />
                            {booking.phone}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Statut */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[booking.status].color}`}>
                        <StatusIcon className="w-4 h-4" />
                        {STATUS_CONFIG[booking.status].label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(booking.id, 'confirmed')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Confirmer"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => updateStatus(booking.id, 'cancelled')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Annuler"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus(booking.id, 'completed')}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg"
                        >
                          Marquer terminé
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}