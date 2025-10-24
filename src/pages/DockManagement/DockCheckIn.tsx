// src/pages/DockManagement/DockCheckIn.tsx
import { useState } from 'react';
import { useTodayBookings,} from '../../hooks/useDockBookings';
import { 
  Truck, Clock, PlayCircle, StopCircle, CheckCircle, 
  XCircle, User, Hash, AlertCircle 
} from 'lucide-react';
import { format } from 'date-fns';


interface DockCheckInProps {
  companyId?: string;
}

export default function DockCheckIn({ companyId }: DockCheckInProps) {
  const { bookings: todayBookings, loading, checkIn, startLoading, completeLoading, checkOut, markNoShow } = useTodayBookings(companyId);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInData, setCheckInData] = useState({
    vehicle_plate: '',
    driver_name: '',
    driver_phone: ''
  });

  // Filtrer par statut
  const pendingBookings = todayBookings.filter(b => b.status === 'confirmed' || b.status === 'requested');
  const inProgressBookings = todayBookings.filter(b => b.status === 'in_progress');
  const completedBookings = todayBookings.filter(b => b.status === 'completed');

  const handleCheckIn = async () => {
    if (!selectedBooking) return;
    
    await checkIn(selectedBooking.id, checkInData);
    setShowCheckInModal(false);
    setSelectedBooking(null);
    setCheckInData({ vehicle_plate: '', driver_name: '', driver_phone: '' });
  };

  const handleStartLoading = async (bookingId: string) => {
    await startLoading(bookingId);
  };

  const handleCompleteLoading = async (bookingId: string) => {
    await completeLoading(bookingId);
  };

  const handleCheckOut = async (bookingId: string) => {
    await checkOut(bookingId);
  };

  const handleMarkNoShow = async (bookingId: string) => {
    if (confirm('Marquer ce transporteur comme absent ?')) {
      await markNoShow(bookingId);
    }
  };

  const BookingCard = ({ booking, actions }: any) => {
    const slotStart = new Date(booking.slot_start);
    const slotEnd = new Date(booking.slot_end);

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-5 h-5 text-gray-400" />
              <span className="font-bold text-gray-900">{booking.transporter_name}</span>
            </div>
            <div className="text-sm text-gray-600">
              {format(slotStart, 'HH:mm')} - {format(slotEnd, 'HH:mm')}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-500">Quai</div>
            <div className="font-medium text-gray-900">#{booking.dock_id?.slice(0, 8)}</div>
          </div>
        </div>

        {booking.vehicle_plate && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Hash className="w-4 h-4" />
            {booking.vehicle_plate}
          </div>
        )}

        {booking.driver_name && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <User className="w-4 h-4" />
            {booking.driver_name}
          </div>
        )}

        {booking.loading_start_time && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Clock className="w-4 h-4" />
            Démarré à {format(new Date(booking.loading_start_time), 'HH:mm')}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {actions}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* STATS RAPIDES */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{todayBookings.length}</div>
          <div className="text-sm text-gray-600">Total aujourd'hui</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">{pendingBookings.length}</div>
          <div className="text-sm text-gray-600">En attente</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">{inProgressBookings.length}</div>
          <div className="text-sm text-gray-600">En cours</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">{completedBookings.length}</div>
          <div className="text-sm text-gray-600">Terminés</div>
        </div>
      </div>

      {/* EN ATTENTE */}
      {pendingBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            En attente ({pendingBookings.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                actions={
                  <>
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setCheckInData({
                          vehicle_plate: booking.vehicle_plate || '',
                          driver_name: booking.driver_name || '',
                          driver_phone: booking.driver_phone || ''
                        });
                        setShowCheckInModal(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Check-in
                    </button>
                    <button
                      onClick={() => handleMarkNoShow(booking.id)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* EN COURS */}
      {inProgressBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            En cours ({inProgressBookings.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inProgressBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                actions={
                  <>
                    {!booking.loading_start_time ? (
                      <button
                        onClick={() => handleStartLoading(booking.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Démarrer chargement
                      </button>
                    ) : !booking.loading_end_time ? (
                      <button
                        onClick={() => handleCompleteLoading(booking.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                      >
                        <StopCircle className="w-4 h-4" />
                        Terminer chargement
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCheckOut(booking.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Check-out
                      </button>
                    )}
                  </>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* TERMINÉS */}
      {completedBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Terminés aujourd'hui ({completedBookings.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                actions={
                  <div className="flex-1 text-center text-sm text-gray-600 py-2">
                    ✓ Terminé
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}

      {todayBookings.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-600">Aucune réservation prévue aujourd'hui</div>
        </div>
      )}

      {/* MODAL CHECK-IN */}
      {showCheckInModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Check-in - {selectedBooking.transporter_name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plaque d'immatriculation
                </label>
                <input
                  type="text"
                  value={checkInData.vehicle_plate}
                  onChange={(e) => setCheckInData({ ...checkInData, vehicle_plate: e.target.value })}
                  placeholder="AB-123-CD"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du chauffeur
                </label>
                <input
                  type="text"
                  value={checkInData.driver_name}
                  onChange={(e) => setCheckInData({ ...checkInData, driver_name: e.target.value })}
                  placeholder="Jean Dupont"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone chauffeur
                </label>
                <input
                  type="tel"
                  value={checkInData.driver_phone}
                  onChange={(e) => setCheckInData({ ...checkInData, driver_phone: e.target.value })}
                  placeholder="06 12 34 56 78"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCheckInModal(false);
                  setSelectedBooking(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCheckIn}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Confirmer Check-in
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}