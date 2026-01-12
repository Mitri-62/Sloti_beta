// src/pages/ChatPage.tsx - VERSION AMÉLIORÉE UX
// 🔒 SÉCURITÉ: Filtres user_id ajoutés sur UPDATE/DELETE messages
// ✨ UX: Touch targets 44px, Optimistic UI, Custom modals, File preview, Keyboard nav
import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Send, Paperclip, Smile, Hash, AlertCircle, 
  Edit2, Trash2, Check, X, Search, Loader, Image as ImageIcon,
  File, Download, Settings, MoreVertical, Reply, Copy, Undo2
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatMessages } from "../hooks/useChatMessages";
import { useTypingIndicator } from "../hooks/useTypingIndicator";
import { useFileUpload } from "../hooks/useFileUpload";
import { useChatStore } from "../stores/useChatStore";
import { Avatar } from "../components/Avatar";
import ChannelSettingsModal from "../components/ChannelSettingsModal";
import { toast } from "sonner";

const EMOJI_LIST = ["👍", "❤️", "😂", "😮", "🎉", "🚀"];
const UNDO_DELAY = 5000; // 5 secondes pour annuler

// ============================================================================
// COMPOSANT: Modal de confirmation personnalisée
// ============================================================================
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = 'danger',
  onConfirm, 
  onCancel 
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        ref={modalRef}
        tabIndex={-1}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 rounded-xl text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${variantStyles[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT: Toast Undo pour annuler la suppression
// ============================================================================
interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onExpire: () => void;
  duration?: number;
}

function UndoToast({ message, onUndo, onExpire, duration = UNDO_DELAY }: UndoToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onExpire]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[280px]">
        <span className="flex-1 text-sm font-medium">{message}</span>
        <button
          onClick={onUndo}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 rounded-lg text-sm font-semibold transition-colors"
        >
          <Undo2 size={14} />
          Annuler
        </button>
      </div>
      {/* Barre de progression */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 dark:bg-gray-300 rounded-b-xl overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-50 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT: Menu contextuel pour mobile (long press)
// ============================================================================
interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  isOwnMessage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReact: () => void;
  onCopy: () => void;
  onClose: () => void;
}

function ContextMenu({ 
  isOpen, 
  position, 
  isOwnMessage, 
  onEdit, 
  onDelete, 
  onReact, 
  onCopy,
  onClose 
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Ajuster la position pour rester dans l'écran
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 250),
  };

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
      style={{ 
        left: adjustedPosition.x, 
        top: adjustedPosition.y,
      }}
    >
      <button
        onClick={() => { onReact(); onClose(); }}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <Smile size={18} className="text-gray-500" />
        <span className="text-gray-900 dark:text-white">Réagir</span>
      </button>
      
      <button
        onClick={() => { onCopy(); onClose(); }}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <Copy size={18} className="text-gray-500" />
        <span className="text-gray-900 dark:text-white">Copier</span>
      </button>

      {isOwnMessage && (
        <>
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
          
          <button
            onClick={() => { onEdit(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          >
            <Edit2 size={18} className="text-gray-500" />
            <span className="text-gray-900 dark:text-white">Modifier</span>
          </button>
          
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
          >
            <Trash2 size={18} className="text-red-500" />
            <span className="text-red-600 dark:text-red-400">Supprimer</span>
          </button>
        </>
      )}
    </div>
  );
}

// ============================================================================
// COMPOSANT: Prévisualisation de fichier avant envoi
// ============================================================================
interface FilePreviewProps {
  url: string;
  type: string;
  file?: File; // ✅ Fichier original pour créer un blob URL local
  onRemove: () => void;
}

function FilePreview({ url, type, file, onRemove }: FilePreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  
  const isImage = type?.startsWith('image/');
  const isVideo = type?.startsWith('video/');
  const isPDF = type === 'application/pdf';

  // Créer une URL locale pour la prévisualisation immédiate avec FileReader
  useEffect(() => {
    if (file && isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalPreviewUrl(reader.result as string);
      };
      reader.onerror = () => {
        console.error("FileReader error");
        setImageError(true);
      };
      reader.readAsDataURL(file);
    } else if (file && isVideo) {
      // Pour les vidéos, utiliser createObjectURL
      const blobUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(blobUrl);
      return () => URL.revokeObjectURL(blobUrl);
    }
  }, [file, isImage, isVideo]);

  // URL à utiliser : locale en priorité, sinon URL Supabase
  const previewUrl = localPreviewUrl || url;

  // Debug log
  useEffect(() => {
    console.log("FilePreview:", { 
      hasFile: !!file, 
      type, 
      localPreviewUrl: localPreviewUrl?.substring(0, 50),
      url: url?.substring(0, 50)
    });
  }, [file, type, localPreviewUrl, url]);

  return (
    <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        {isImage ? (
          <div className="relative group w-24 h-24 flex-shrink-0">
            {/* Placeholder pendant le chargement */}
            {!imageLoaded && !imageError && !localPreviewUrl && (
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center animate-pulse">
                <Loader size={24} className="text-gray-400 dark:text-gray-500 animate-spin" />
              </div>
            )}
            
            {/* Image cassée - seulement si on a essayé de charger */}
            {imageError && (
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center">
                <ImageIcon size={20} className="text-gray-400 dark:text-gray-500" />
                <span className="text-xs text-gray-500 mt-1">Erreur</span>
              </div>
            )}
            
            {/* Image réelle - afficher dès qu'on a le localPreviewUrl */}
            {previewUrl && (
              <img 
                src={previewUrl} 
                alt="Prévisualisation" 
                className={`w-24 h-24 object-cover rounded-lg shadow-sm transition-opacity absolute inset-0 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => {
                  setImageLoaded(true);
                  setImageError(false);
                }}
                onError={() => {
                  console.error("Image load error for:", previewUrl?.substring(0, 50));
                  // Ne pas marquer comme erreur si c'est l'URL Supabase qui échoue mais qu'on a le fichier local
                  if (!localPreviewUrl) {
                    setImageError(true);
                  }
                }}
              />
            )}
            
            {/* Overlay hover */}
            {imageLoaded && !imageError && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-white">
                  <ImageIcon size={24} />
                </a>
              </div>
            )}
          </div>
        ) : isVideo ? (
          <div className="relative w-32 h-24 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            {previewUrl ? (
              <>
                <video 
                  src={previewUrl} 
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  onLoadedData={(e) => {
                    const video = e.currentTarget;
                    video.currentTime = 0.1;
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[12px] border-l-gray-800 border-y-[8px] border-y-transparent ml-1" />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader size={24} className="text-gray-400 animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <File size={24} className="text-gray-500 dark:text-gray-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {file?.name || (isImage ? 'Image' : isVideo ? 'Vidéo' : isPDF ? 'Document PDF' : 'Fichier')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {imageError && !localPreviewUrl 
              ? "Erreur de chargement - sera uploadé quand même" 
              : "Prêt à envoyer"
            }
          </p>
          {file && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {file.size < 1024 
                ? `${file.size} octets`
                : file.size < 1024 * 1024 
                  ? `${(file.size / 1024).toFixed(1)} Ko`
                  : `${(file.size / (1024 * 1024)).toFixed(1)} Mo`
              }
            </p>
          )}
        </div>

        <button 
          onClick={onRemove}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
          aria-label="Retirer le fichier"
        >
          <X size={18} className="text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL: ChatPage
// ============================================================================
export default function ChatPage() {
  const { user } = useAuth();
  const { channelId, userId: dmUserId } = useParams();
  const navigate = useNavigate();
  
  const conversationId = dmUserId || channelId || 'general';
  
  const { messages, loading: messagesLoading, hasMore, loadMore, addOptimisticMessage, removeOptimisticMessage } = useChatMessages(
    conversationId, 
    user?.company_id || '',
    user?.id,
    !!dmUserId
  );
  
  const { typingUsers, notifyTyping } = useTypingIndicator(
    channelId || 'general',
  );
  
  const { uploadFile, uploading: fileUploading, progress } = useFileUpload();
  
  const {
    editingId,
    editContent,
    showEmojiPicker,
    searchQuery,
    error,
    setEditingId,
    setEditContent,
    setShowEmojiPicker,
    setSearchQuery,
    setError
  } = useChatStore();

  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null); // ✅ Fichier original pour preview local
  const [channel, setChannel] = useState<any>(null);
  const [channelLoading, setChannelLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // États UX améliorés
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; messageId: string | null }>({ 
    isOpen: false, 
    messageId: null 
  });
  const [undoState, setUndoState] = useState<{ 
    show: boolean; 
    messageId: string | null;
    messageData: any | null;
  }>({ show: false, messageId: null, messageData: null });
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    messageId: string | null;
    isOwnMessage: boolean;
  }>({ isOpen: false, position: { x: 0, y: 0 }, messageId: null, isOwnMessage: false });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Charger les infos du canal
  useEffect(() => {
    if (channelId) {
      loadChannelInfo();
    } else {
      setChannelLoading(false);
    }
  }, [channelId]);

  const loadChannelInfo = async () => {
    if (!channelId) return;
    
    setChannelLoading(true);
    try {
      const { data, error } = await supabase
        .from("channels")
        .select(`
          *,
          channel_members!inner(role, can_write)
        `)
        .eq("id", channelId)
        .eq("channel_members.user_id", user?.id)
        .single();

      if (error) {
        toast.error("Impossible d'accéder à ce canal");
        navigate("/app/chat");
        return;
      }

      setChannel({
        ...data,
        userRole: data.channel_members[0]?.role,
        canWrite: data.channel_members[0]?.can_write,
      });
    } catch (error) {
      console.error("Erreur chargement canal:", error);
    } finally {
      setChannelLoading(false);
    }
  };

  // Scroll to bottom au chargement initial
  useEffect(() => {
    if (!messagesLoading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messagesLoading]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !messagesLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (topRef.current) {
      observer.observe(topRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, messagesLoading, loadMore]);

  // Recherche avec highlight
  const searchedMessages = searchQuery
    ? messages.filter((m: any) =>
        m.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Scroll automatique pour nouveaux messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const shouldScroll = lastMessage?.user_id === user?.id || lastMessage?.isOptimistic;
    
    if (shouldScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, user?.id]);

  // Focus initial
  useEffect(() => {
    inputRef.current?.focus();
  }, [channelId]);

  // Fermer emoji picker au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(null);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showEmojiPicker, setShowEmojiPicker]);

  // Auto-hide errors
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  // Gestion clavier globale
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingId) {
          setEditingId(null);
          setEditContent("");
        }
        if (showEmojiPicker) {
          setShowEmojiPicker(null);
        }
        if (contextMenu.isOpen) {
          setContextMenu(prev => ({ ...prev, isOpen: false }));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingId, showEmojiPicker, contextMenu.isOpen, setEditingId, setEditContent, setShowEmojiPicker]);

  // Indicateur de frappe
  const handleTyping = () => {
    if (user?.name || user?.email) {
      notifyTyping(user.name || user.email?.split('@')[0] || 'Anonymous');
    }
  };

  // Long press pour mobile
  const handleTouchStart = useCallback((e: React.TouchEvent, messageId: string, isOwnMessage: boolean) => {
    const touch = e.touches[0];
    const timer = setTimeout(() => {
      setContextMenu({
        isOpen: true,
        position: { x: touch.clientX, y: touch.clientY },
        messageId,
        isOwnMessage,
      });
      // Vibration feedback si disponible
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
    setLongPressTimer(timer);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  // Copier le message
  const copyMessage = async (messageId: string) => {
    const message = messages.find((m: any) => m.id === messageId);
    if (message?.content) {
      await navigator.clipboard.writeText(message.content);
      toast.success("Message copié");
    }
  };

  // Envoi message avec Optimistic UI
  const sendMessage = async () => {
    if ((!newMsg.trim() && !attachmentUrl) || !user || !user.company_id || sending) return;
    
    if (channelId && channel && !channel.canWrite) {
      toast.error("Vous n'avez pas la permission d'écrire dans ce canal");
      return;
    }

    const messageContent = newMsg.trim() || '📎 Fichier joint';
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic update
    const optimisticMessage = {
      id: tempId,
      content: messageContent,
      user_id: user.id,
      username: user.name || user.email?.split("@")[0] || "Anonyme",
      company_id: user.company_id, // ✅ Garanti non-undefined par le guard ci-dessus
      channel_id: channelId || null,
      receiver_id: dmUserId || null,
      attachment_url: attachmentUrl || undefined,
      attachment_type: attachmentType || undefined,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      reactions: [],
    };

    // Ajouter immédiatement le message optimiste
    addOptimisticMessage?.(optimisticMessage);
    
    // Reset input immédiatement
    setNewMsg("");
    setAttachmentUrl(null);
    setAttachmentType(null);
    setAttachmentFile(null); // ✅ Nettoyer le fichier aussi
    if (inputRef.current) {
      inputRef.current.style.height = "48px";
      inputRef.current.focus();
    }

    setSending(true);

    try {
      const messageData: any = {
        content: messageContent,
        user_id: user.id,
        username: user.name || user.email?.split("@")[0] || "Anonyme",
        company_id: user.company_id,
        channel_id: channelId || null,
        receiver_id: dmUserId || null,
      };

      if (attachmentUrl) {
        messageData.attachment_url = attachmentUrl;
        messageData.attachment_type = attachmentType;
      }

      const { error } = await supabase.from("chat_messages").insert([messageData]);
      
      if (error) throw error;
      
      // Retirer le message optimiste (sera remplacé par le vrai via realtime)
      removeOptimisticMessage?.(tempId);
      
    } catch (err: any) {
      console.error("❌ Erreur envoi:", err);
      removeOptimisticMessage?.(tempId);
      setError(err.message || "Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  };

  // 🔒 SÉCURITÉ: Edition avec filtre user_id obligatoire
  const editMessage = async (id: string) => {
    if (!editContent.trim() || !user?.id) return;
    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({ content: editContent.trim(), edited: true })
        .eq("id", id)
        .eq("user_id", user.id);
        
      if (error) throw error;
      
      setEditingId(null);
      setEditContent("");
      toast.success("Message modifié");
    } catch (err: any) {
      setError(err.message || "Impossible de modifier le message.");
    }
  };

  // Ouvrir modal de suppression
  const openDeleteModal = (id: string) => {
    setDeleteModal({ isOpen: true, messageId: id });
  };

  // 🔒 SÉCURITÉ: Suppression avec Undo
  const deleteMessage = async () => {
    const messageId = deleteModal.messageId;
    if (!messageId || !user?.id) return;

    // Sauvegarder le message pour undo
    const messageToDelete = messages.find((m: any) => m.id === messageId);
    
    setDeleteModal({ isOpen: false, messageId: null });

    try {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", messageId)
        .eq("user_id", user.id);
        
      if (error) throw error;

      // Afficher l'option Undo
      setUndoState({
        show: true,
        messageId,
        messageData: messageToDelete,
      });
      
    } catch (err: any) {
      setError(err.message || "Impossible de supprimer le message.");
    }
  };

  // Restaurer le message supprimé
  const undoDelete = async () => {
    if (!undoState.messageData) return;

    try {
      const { id, isOptimistic, ...messageData } = undoState.messageData;
      
      const { error } = await supabase
        .from("chat_messages")
        .insert([messageData]);
        
      if (error) throw error;
      
      toast.success("Message restauré");
    } catch (err: any) {
      setError("Impossible de restaurer le message.");
    } finally {
      setUndoState({ show: false, messageId: null, messageData: null });
    }
  };

  // 🔒 SÉCURITÉ: Réactions
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user?.id) return;
    
    const message = messages.find((m: any) => m.id === messageId);
    if (!message) return;

    if (message.company_id !== user.company_id) {
      setError("Vous ne pouvez pas réagir à ce message.");
      return;
    }

    const reactions = message.reactions || [];
    const existing = reactions.find((r: any) => r.emoji === emoji);

    let newReactions;
    if (existing) {
      if (existing.users.includes(user?.id)) {
        existing.users = existing.users.filter((u: string) => u !== user?.id);
        newReactions = existing.users.length === 0
          ? reactions.filter((r: any) => r.emoji !== emoji)
          : [...reactions];
      } else {
        existing.users.push(user?.id);
        newReactions = [...reactions];
      }
    } else {
      newReactions = [...reactions, { emoji, users: [user?.id] }];
    }

    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({ reactions: newReactions })
        .eq("id", messageId)
        .eq("company_id", user.company_id);
        
      if (error) throw error;
      
      setShowEmojiPicker(null);
    } catch (err: any) {
      setError(err.message || "Impossible d'ajouter la réaction.");
    }
  };

  // Upload fichier
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ✅ Stocker le fichier immédiatement pour preview local
    setAttachmentFile(file);
    setAttachmentType(file.type);

    try {
      const url = await uploadFile(file);
      if (url) {
        setAttachmentUrl(url);
      } else {
        // Upload échoué, nettoyer
        setAttachmentFile(null);
        setAttachmentType(null);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'upload");
      setAttachmentFile(null);
      setAttachmentType(null);
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMsg(e.target.value);
    handleTyping();
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffInMinutes = (now.getTime() - d.getTime()) / (1000 * 60);
    const diffInHours = diffInMinutes / 60;

    if (diffInMinutes < 1) return "À l'instant";
    if (diffInMinutes < 60) return `Il y a ${Math.floor(diffInMinutes)} min`;
    if (diffInHours < 24) {
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } else if (diffInHours < 48) {
      return "Hier " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } else {
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    }
  };

  // Rendu d'une pièce jointe
  const renderAttachment = (url: string, type: string) => {
    if (type?.startsWith('image/')) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img 
            src={url} 
            alt="Attachment" 
            className="max-w-xs rounded-lg shadow-sm hover:shadow-md transition-shadow" 
            loading="lazy"
          />
        </a>
      );
    }
    
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 mt-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors w-fit"
      >
        <File size={16} />
        <span className="text-sm">Télécharger le fichier</span>
        <Download size={14} />
      </a>
    );
  };

  if (channelLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <Loader size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-gray-900">
      {/* HEADER FIXE */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm z-30">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {channel ? (
                <>
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Hash size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-900 dark:text-white truncate">
                      #{channel.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {channel.description || "Aucune description"}
                    </p>
                  </div>
                  {channel.userRole === 'guest' && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full whitespace-nowrap">
                      Lecture seule
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Hash size={20} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-900 dark:text-white truncate">
                      {dmUserId ? "Message privé" : "Chat général"}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.company_name}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {channel && channel.userRole === 'admin' && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
                  title="Paramètres du canal"
                  aria-label="Paramètres du canal"
                >
                  <Settings size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
              )}
              
              <div className="relative hidden sm:block">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 lg:w-64 pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              
              {/* Bouton recherche mobile */}
              <button
                className="sm:hidden p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
                onClick={() => {
                  // Toggle search on mobile
                  const input = document.getElementById('mobile-search');
                  input?.classList.toggle('hidden');
                  input?.focus();
                }}
                aria-label="Rechercher"
              >
                <Search size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* Barre de recherche mobile */}
          <input
            id="mobile-search"
            type="text"
            placeholder="Rechercher dans les messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="hidden sm:hidden w-full mt-3 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* ZONE DE MESSAGES */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50 dark:bg-gray-900"
      >
        <div ref={topRef} className="h-4 flex items-center justify-center">
          {messagesLoading && hasMore && (
            <Loader size={20} className="text-gray-400 dark:text-gray-500 animate-spin" />
          )}
        </div>

        {messagesLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader size={48} className="mx-auto text-blue-500 dark:text-blue-400 mb-3 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Chargement des messages...</p>
            </div>
          </div>
        ) : searchedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Hash size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {searchQuery ? "Aucun résultat" : "Aucun message"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery ? "Essayez avec d'autres mots-clés" : "Soyez le premier à écrire !"}
              </p>
            </div>
          </div>
        ) : (
          searchedMessages.map((m: any, idx: number) => {
            const isCurrentUser = m.user_id === user?.id;
            const showDate =
              idx === 0 ||
              new Date(m.created_at).toDateString() !==
                new Date(searchedMessages[idx - 1].created_at).toDateString();

            return (
              <div key={m.id}>
                {showDate && (
                  <div className="flex items-center justify-center my-6">
                    <div className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                      {new Date(m.created_at).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                  </div>
                )}

                <div 
                  className={`flex gap-3 group ${isCurrentUser ? "flex-row-reverse" : ""}`}
                  onTouchStart={(e) => handleTouchStart(e, m.id, isCurrentUser)}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                >
                  {!isCurrentUser && (
                    <Avatar username={m.username} size="md" />
                  )}

                  <div className={`flex flex-col max-w-[85%] sm:max-w-lg ${isCurrentUser ? "items-end" : "items-start"} flex-1`}>
                    {!isCurrentUser && (
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{m.username}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(m.created_at)}</span>
                      </div>
                    )}

                    <div className="relative group/message">
                      {editingId === m.id ? (
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm">
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white min-w-0"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") editMessage(m.id);
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditContent("");
                              }
                            }}
                          />
                          <button 
                            onClick={() => editMessage(m.id)} 
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors touch-manipulation"
                            aria-label="Confirmer la modification"
                          >
                            <Check size={18} />
                          </button>
                          <button 
                            onClick={() => { setEditingId(null); setEditContent(""); }} 
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors touch-manipulation"
                            aria-label="Annuler la modification"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                              isCurrentUser
                                ? "bg-blue-600 dark:bg-blue-500 text-white rounded-br-md"
                                : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-700"
                            } ${m.isOptimistic ? 'opacity-70' : ''}`}
                          >
                            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {m.content}
                              </ReactMarkdown>
                            </div>
                            
                            {m.attachment_url && renderAttachment(m.attachment_url, m.attachment_type)}
                            
                            {m.edited && (
                              <span className="text-xs opacity-60 ml-2">(modifié)</span>
                            )}
                            
                            {m.isOptimistic && (
                              <span className="text-xs opacity-60 ml-2">Envoi...</span>
                            )}
                          </div>

                          {/* Actions desktop - positionnées plus près du message */}
                          <div
                            className={`absolute ${isCurrentUser ? "-left-24" : "-right-24"} top-1/2 -translate-y-1/2 opacity-0 group-hover/message:opacity-100 transition-opacity hidden sm:flex gap-1`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowEmojiPicker(showEmojiPicker === m.id ? null : m.id);
                              }}
                              className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm transition-colors"
                              title="Ajouter une réaction"
                              aria-label="Ajouter une réaction"
                            >
                              <Smile size={16} />
                            </button>

                            {isCurrentUser && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingId(m.id);
                                    setEditContent(m.content);
                                  }}
                                  className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm transition-colors"
                                  title="Modifier"
                                  aria-label="Modifier le message"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => openDeleteModal(m.id)}
                                  className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 shadow-sm transition-colors"
                                  title="Supprimer"
                                  aria-label="Supprimer le message"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>

                          {/* Bouton menu mobile */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setContextMenu({
                                isOpen: true,
                                position: { x: rect.left, y: rect.bottom + 8 },
                                messageId: m.id,
                                isOwnMessage: isCurrentUser,
                              });
                            }}
                            className={`absolute ${isCurrentUser ? "-left-10" : "-right-10"} top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 sm:hidden touch-manipulation`}
                            aria-label="Plus d'options"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {showEmojiPicker === m.id && (
                            <div
                              ref={emojiPickerRef}
                              className={`absolute ${
                                isCurrentUser ? "right-0" : "left-0"
                              } bottom-full mb-2 p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-xl flex gap-1 z-10 min-w-max`}
                            >
                              {EMOJI_LIST.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(m.id, emoji)}
                                  className="hover:scale-125 transition-transform text-xl p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 touch-manipulation"
                                  aria-label={`Réagir avec ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {m.reactions && m.reactions.length > 0 && (
                      <div className={`flex gap-1 mt-1 flex-wrap ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        {m.reactions.map((reaction: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => toggleReaction(m.id, reaction.emoji)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all hover:scale-105 touch-manipulation ${
                              reaction.users.includes(user?.id)
                                ? "bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300"
                                : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            <span>{reaction.emoji}</span>
                            <span className="font-medium">{reaction.users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {isCurrentUser && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
                        {formatDate(m.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-1">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'est en train' : 'sont en train'} d'écrire...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ZONE D'INPUT */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:p-4 z-30">
        {error && (
          <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span className="flex-1 min-w-0">{error}</span>
            <button 
              onClick={() => setError(null)} 
              className="p-1 hover:opacity-70 flex-shrink-0 touch-manipulation"
              aria-label="Fermer l'erreur"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {fileUploading && (
          <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Loader size={16} className="animate-spin flex-shrink-0" />
            <span>Upload en cours... {progress}%</span>
            <div className="flex-1 h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden ml-2">
              <div 
                className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {attachmentFile && attachmentType && (
          <FilePreview 
            url={attachmentUrl || ''} 
            type={attachmentType}
            file={attachmentFile}
            onRemove={() => { 
              setAttachmentUrl(null); 
              setAttachmentType(null); 
              setAttachmentFile(null);
            }}
          />
        )}

        {channel && !channel.canWrite && (
          <div className="mb-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>Vous êtes en lecture seule dans ce canal</span>
          </div>
        )}

        <div className="flex items-end gap-2 sm:gap-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept="image/*,application/pdf,text/*,video/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={fileUploading || (channel && !channel.canWrite)}
            className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 text-gray-600 dark:text-gray-400 touch-manipulation"
            title="Ajouter une pièce jointe"
            aria-label="Ajouter une pièce jointe"
          >
            <Paperclip size={20} />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={newMsg}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyPress}
              placeholder={
                channel && !channel.canWrite
                  ? "Vous ne pouvez pas écrire dans ce canal"
                  : "Écrire un message..."
              }
              rows={1}
              className="w-full px-4 py-3 rounded-xl resize-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
              disabled={sending || fileUploading || (channel && !channel.canWrite)}
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={(!newMsg.trim() && !attachmentUrl) || sending || fileUploading || (channel && !channel.canWrite)}
            className={`p-3 sm:px-5 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all touch-manipulation min-w-[48px] ${
              (!newMsg.trim() && !attachmentUrl) || sending || fileUploading || (channel && !channel.canWrite)
                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed"
                : "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-sm hover:shadow-md active:scale-95"
            }`}
            aria-label="Envoyer le message"
          >
            <Send size={20} className={sending ? "animate-pulse" : ""} />
            <span className="hidden sm:inline">{sending ? "Envoi..." : "Envoyer"}</span>
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center hidden sm:block">
          **gras** • *italique* • `code` • Entrée pour envoyer • Échap pour annuler
        </p>
      </div>

      {/* MODALS ET OVERLAYS */}
      
      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Supprimer le message ?"
        message="Cette action peut être annulée pendant quelques secondes après la suppression."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
        onConfirm={deleteMessage}
        onCancel={() => setDeleteModal({ isOpen: false, messageId: null })}
      />

      {/* Toast Undo */}
      {undoState.show && (
        <UndoToast
          message="Message supprimé"
          onUndo={undoDelete}
          onExpire={() => setUndoState({ show: false, messageId: null, messageData: null })}
        />
      )}

      {/* Menu contextuel mobile */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        isOwnMessage={contextMenu.isOwnMessage}
        onEdit={() => {
          const message = messages.find((m: any) => m.id === contextMenu.messageId);
          if (message) {
            setEditingId(message.id);
            setEditContent(message.content);
          }
        }}
        onDelete={() => {
          if (contextMenu.messageId) {
            openDeleteModal(contextMenu.messageId);
          }
        }}
        onReact={() => {
          if (contextMenu.messageId) {
            setShowEmojiPicker(contextMenu.messageId);
          }
        }}
        onCopy={() => {
          if (contextMenu.messageId) {
            copyMessage(contextMenu.messageId);
          }
        }}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
      />

      {showSettings && channel && (
        <ChannelSettingsModal
          channelId={channel.id}
          onClose={() => setShowSettings(false)}
          onUpdate={() => {
            setShowSettings(false);
            loadChannelInfo();
          }}
        />
      )}
    </div>
  );
}