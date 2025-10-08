import { Wifi, WifiOff } from 'lucide-react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
}

export default function OfflineIndicator({ isOnline, isSyncing }: OfflineIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
      isOnline ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
    }`}>
      {isOnline ? (
        <>
          <Wifi size={16} />
          <span>{isSyncing ? 'Synchronisation...' : 'Connecté'}</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>Mode hors ligne</span>
        </>
      )}
    </div>
  );
}