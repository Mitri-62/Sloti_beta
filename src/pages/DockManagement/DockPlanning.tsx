// src/pages/DockManagement/DockPlanning.tsx
import { useState } from 'react';
import { useDockBookings } from '../../hooks/useDockBookings';
import { DockRow, BookingStatus } from '../../types/dock.types';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import DockBookingForm from '../../components/DockBookingForm';

interface DockPlanningProps {
  docks: DockRow[];
  companyId?: string;
}

export default function DockPlanning({ docks, companyId }: DockPlanningProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDock, setSelectedDock] = useState<DockRow | null>(null);

  const startDate = format(selectedDate, 'yyyy-MM-dd');
  const endDate = format(addDays(selectedDate, 1), 'yyyy-MM-dd');

  const { bookings, loading, create } = useDockBookings(companyId, {
    filters: {
      date_from: `${startDate}T00:00:00Z`,
      date_to: `${endDate}T23:59:59Z`
    }
  });

  const handlePreviousDay = () => {
    setSelectedDate(prev => addDays(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleCreateBooking = (dock: DockRow) => {
    setSelectedDock(dock);
    setShowBookingForm(true);
  };

  const handleSaveBooking = async (bookingData: any) => {
    await create({
      ...bookingData,
      company_id: companyId!,
      dock_id: selectedDock!.id
    });
    setShowBookingForm(false);
    setSelectedDock(null);
  };

  // Heures de la journée (8h-18h)
  const hours = Array.from({ length: 11 }, (_, i) => i + 8);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* HEADER */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {bookings.length} réservation{bookings.length > 1 ? 's' : ''}
              </p>
            </div>

            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="w-5 h-5" />
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="overflow-auto">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement du planning...</p>
          </div>
        ) : (
          <div className="min-w-[800px]">
            {/* HEADER HEURES */}
            <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0">
              <div className="w-48 p-4 font-medium text-gray-700 border-r border-gray-200">
                Quai
              </div>
              {hours.map(hour => (
                <div
                  key={hour}
                  className="flex-1 p-4 text-center text-sm font-medium text-gray-700 border-r border-gray-200"
                >
                  {hour}:00
                </div>
              ))}
            </div>

            {/* LIGNES QUAIS */}
            {docks.map(dock => {
              const dockBookings = bookings.filter(b => b.dock_id === dock.id);

              return (
                <div key={dock.id} className="flex border-b border-gray-200 hover:bg-gray-50">
                  {/* NOM QUAI */}
                  <div className="w-48 p-4 border-r border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{dock.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{dock.type}</div>
                    </div>
                    <button
                      onClick={() => handleCreateBooking(dock)}
                      className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* TIMELINE */}
                  <div className="flex-1 relative h-20">
                    {/* GRILLE HEURES */}
                    {hours.map(hour => (
                      <div
                        key={hour}
                        className="absolute top-0 bottom-0 border-r border-gray-200"
                        style={{ left: `${((hour - 8) / 10) * 100}%` }}
                      />
                    ))}

                    {/* RÉSERVATIONS */}
                    {dockBookings.map(booking => {
                      const start = new Date(booking.slot_start);
                      const end = new Date(booking.slot_end);
                      const startHour = start.getHours() + start.getMinutes() / 60;
                      const endHour = end.getHours() + end.getMinutes() / 60;
                      
                      const left = ((startHour - 8) / 10) * 100;
                      const width = ((endHour - startHour) / 10) * 100;

                      const statusColors: Record<BookingStatus, string> = {
                        requested: 'bg-yellow-100 border-yellow-300 text-yellow-800',
                        confirmed: 'bg-blue-100 border-blue-300 text-blue-800',
                        in_progress: 'bg-green-100 border-green-300 text-green-800',
                        completed: 'bg-gray-100 border-gray-300 text-gray-600',
                        cancelled: 'bg-red-100 border-red-300 text-red-600',
                        no_show: 'bg-red-200 border-red-400 text-red-800'
                      };

                      return (
                        <div
                          key={booking.id}
                          className={`absolute top-2 bottom-2 border-l-4 rounded px-2 py-1 cursor-pointer hover:shadow-md transition-shadow ${
                            statusColors[booking.status]
                          }`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <div className="text-xs font-medium truncate">
                            {booking.transporter_name}
                          </div>
                          <div className="text-xs opacity-75 truncate">
                            {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {docks.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                Aucun quai configuré. Créez votre premier quai pour commencer.
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL FORMULAIRE RÉSERVATION */}
      {showBookingForm && selectedDock && (
        <DockBookingForm
          dock={selectedDock}
          date={selectedDate}
          onSave={handleSaveBooking}
          onClose={() => {
            setShowBookingForm(false);
            setSelectedDock(null);
          }}
        />
      )}
    </div>
  );
}