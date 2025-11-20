// src/components/ShareDriverModal.tsx - Modal de partage avancée
import { useState } from 'react';
import { X, Copy, MessageCircle, Mail, Share2, RefreshCw, Clock, Check, QrCode as QrCodeIcon } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';

interface ShareDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverUrl: string;
  tourName: string;
  expiresAt?: string;
  onRegenerate: () => Promise<void>;
}

export default function ShareDriverModal({
  isOpen,
  onClose,
  driverUrl,
  tourName,
  expiresAt,
  onRegenerate
}: ShareDriverModalProps) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(driverUrl);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback
      const tempInput = document.createElement('input');
      tempInput.value = driverUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const message = `Bonjour ! Voici le lien pour votre tournée "${tourName}" :\n\n${driverUrl}\n\nActivez le GPS une fois sur la page. Bonne route ! 🚛`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSMS = () => {
    const message = `Tournée "${tourName}" : ${driverUrl}`;
    window.location.href = `sms:?&body=${encodeURIComponent(message)}`;
  };

  const handleEmail = () => {
    const subject = `Lien pour la tournée ${tourName}`;
    const body = `Bonjour,\n\nVoici le lien d'accès à votre tournée "${tourName}" :\n\n${driverUrl}\n\nInstructions :\n1. Ouvrez ce lien sur votre téléphone\n2. Activez le GPS lorsque demandé\n3. Suivez les instructions pour chaque livraison\n\nCe lien est valide pendant 48 heures.\n\nBonne route !`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleRegenerate = async () => {
    if (!confirm('Régénérer le lien ? L\'ancien lien ne fonctionnera plus.')) return;
    
    setRegenerating(true);
    try {
      await onRegenerate();
      toast.success('Nouveau lien généré !');
    } catch (error) {
      toast.error('Erreur lors de la régénération');
    } finally {
      setRegenerating(false);
    }
  };

  const getTimeRemaining = () => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expiré';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}j ${hours % 24}h restantes`;
    }
    return `${hours}h ${minutes}min restantes`;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Share2 size={24} className="text-purple-600" />
              Partager avec le chauffeur
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {tourName}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Statut du lien */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
                Lien actif {expiresAt && `- ${getTimeRemaining()}`}
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                Le chauffeur pourra accéder à sa tournée avec ce lien unique et sécurisé.
              </p>
            </div>
          </div>
        </div>

        {/* Lien à copier */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Lien d'accès
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={driverUrl}
              readOnly
              className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                copied 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
              }`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
        </div>

        {/* Boutons de partage */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Partager via
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>
            
            <button
              onClick={handleSMS}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <MessageCircle size={18} />
              SMS
            </button>
            
            <button
              onClick={handleEmail}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <Mail size={18} />
              Email
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="mb-6">
          <button
            onClick={() => setShowQR(!showQR)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            <QrCodeIcon size={18} />
            {showQR ? 'Masquer' : 'Afficher'} le QR Code
          </button>
          
          {showQR && (
            <div className="mt-4 flex justify-center p-6 bg-white rounded-lg border-2 border-gray-200">
              <QRCode value={driverUrl} size={200} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
            {regenerating ? 'Régénération...' : 'Régénérer le lien'}
          </button>
          
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}