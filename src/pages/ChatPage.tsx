// src/pages/ChatPage.tsx - VERSION MISE À JOUR AVEC CANAUX
import { useState, useRef, useEffect } from "react";
import { 
  Send, Paperclip, Smile, Hash, AlertCircle, 
  Edit2, Trash2, Check, X, Search, Loader, Image as ImageIcon,
  File, Download, Settings
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

export default function ChatPage() {
  const { user } = useAuth();
  const { channelId } = useParams();
  const navigate = useNavigate();
  
  const { messages, loading: messagesLoading, hasMore, loadMore } = useChatMessages(
    channelId || 'general', 
    user?.company_id || ''
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
  const [channel, setChannel] = useState<any>(null);
  const [channelLoading, setChannelLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

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

  // Scroll automatique
  useEffect(() => {
    const shouldScroll = messages.length > 0 && 
      messages[messages.length - 1]?.user_id === user?.id;
    
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

  // Indicateur de frappe
  const handleTyping = () => {
    if (user?.name || user?.email) {
      notifyTyping(user.name || user.email?.split('@')[0] || 'Anonymous');
    }
  };

  // Envoi message
  const sendMessage = async () => {
    if ((!newMsg.trim() && !attachmentUrl) || !user || sending) return;
    
    // Vérifier les permissions si dans un canal
    if (channelId && channel && !channel.canWrite) {
      toast.error("Vous n'avez pas la permission d'écrire dans ce canal");
      return;
    }

    setSending(true);

    try {
      const messageData: any = {
        content: newMsg.trim() || '📎 Fichier joint',
        user_id: user.id,
        username: user.name || user.email?.split("@")[0] || "Anonyme",
        company_id: user.company_id,
        channel_id: channelId || null,
      };

      if (attachmentUrl) {
        messageData.attachment_url = attachmentUrl;
        messageData.attachment_type = attachmentType;
      }

      const { error } = await supabase.from("chat_messages").insert([messageData]);
      
      if (error) throw error;
      
      setNewMsg("");
      setAttachmentUrl(null);
      setAttachmentType(null);
      
      if (inputRef.current) {
        inputRef.current.style.height = "48px";
        inputRef.current.focus();
      }
    } catch (err: any) {
      setError(err.message || "Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  };

  // Edition
  const editMessage = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({ content: editContent.trim(), edited: true })
        .eq("id", id);
        
      if (error) throw error;
      
      setEditingId(null);
      setEditContent("");
    } catch (err: any) {
      setError(err.message || "Impossible de modifier le message.");
    }
  };

  // Suppression
  const deleteMessage = async (id: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    try {
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Impossible de supprimer le message.");
    }
  };

  // Réactions
  const toggleReaction = async (messageId: string, emoji: string) => {
    const message = messages.find((m: any) => m.id === messageId);
    if (!message) return;

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
        .eq("id", messageId);
        
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

    try {
      const url = await uploadFile(file);
      if (url) {
        setAttachmentUrl(url);
        setAttachmentType(file.type);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'upload");
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
    if (type.startsWith('image/')) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img src={url} alt="Attachment" className="max-w-xs rounded-lg shadow-sm hover:shadow-md transition-shadow" />
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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header avec info canal */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
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
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                    Lecture seule
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Hash size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">
                    Chat général
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
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
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Paramètres du canal"
              >
                <Settings size={20} />
              </button>
            )}
            
            <div className="relative flex-1 max-w-xs">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messages - Zone scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Indicateur de chargement en haut */}
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

                <div className={`flex gap-3 group ${isCurrentUser ? "flex-row-reverse" : ""}`}>
                  {!isCurrentUser && (
                    <Avatar username={m.username} size="md" />
                  )}

                  <div className={`flex flex-col max-w-lg ${isCurrentUser ? "items-end" : "items-start"} flex-1`}>
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
                            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && editMessage(m.id)}
                          />
                          <button onClick={() => editMessage(m.id)} className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                            <Check size={18} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
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
                            }`}
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
                          </div>

                          {/* Actions rapides */}
                          <div
                            className={`absolute ${isCurrentUser ? "-left-28" : "-right-28"} top-1/2 -translate-y-1/2 opacity-0 group-hover/message:opacity-100 transition-opacity flex gap-1`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowEmojiPicker(showEmojiPicker === m.id ? null : m.id);
                              }}
                              className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm"
                              title="Ajouter une réaction"
                            >
                              <Smile size={14} />
                            </button>

                            {isCurrentUser && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingId(m.id);
                                    setEditContent(m.content);
                                  }}
                                  className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm"
                                  title="Modifier"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => deleteMessage(m.id)}
                                  className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 shadow-sm"
                                  title="Supprimer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>

                          {/* Emoji picker */}
                          {showEmojiPicker === m.id && (
                            <div
                              ref={emojiPickerRef}
                              className={`absolute ${
                                isCurrentUser ? "right-0" : "left-0"
                              } bottom-full mb-2 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-xl flex gap-2 z-10 min-w-max`}
                            >
                              {EMOJI_LIST.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(m.id, emoji)}
                                  className="hover:scale-125 transition-transform text-xl p-1"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Réactions */}
                    {m.reactions && m.reactions.length > 0 && (
                      <div className={`flex gap-1 mt-1 flex-wrap ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        {m.reactions.map((reaction: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => toggleReaction(m.id, reaction.emoji)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all hover:scale-110 ${
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

        {/* Indicateur de frappe */}
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

      {/* Zone saisie FIXE */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        {error && (
          <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-3 py-2 rounded-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto hover:opacity-70">
              <X size={16} />
            </button>
          </div>
        )}

        {fileUploading && (
          <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Loader size={16} className="animate-spin" />
            <span>Upload en cours... {progress}%</span>
          </div>
        )}

        {attachmentUrl && (
          <div className="mb-3 flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <ImageIcon size={16} className="text-gray-600 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">Fichier prêt à envoyer</span>
            <button onClick={() => setAttachmentUrl(null)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Avertissement lecture seule */}
        {channel && !channel.canWrite && (
          <div className="mb-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 px-3 py-2 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} />
            <span>Vous êtes en lecture seule dans ce canal</span>
          </div>
        )}

        <div className="flex items-end gap-3">
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
            className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 text-gray-600 dark:text-gray-400"
            title="Ajouter une pièce jointe"
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
                  : "Écrire un message... (Markdown supporté, Entrée pour envoyer)"
              }
              rows={1}
              className="w-full px-4 py-3 rounded-xl resize-none bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={sending || fileUploading || (channel && !channel.canWrite)}
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={(!newMsg.trim() && !attachmentUrl) || sending || fileUploading || (channel && !channel.canWrite)}
            className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
              (!newMsg.trim() && !attachmentUrl) || sending || fileUploading || (channel && !channel.canWrite)
                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed"
                : "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-sm hover:shadow-md"
            }`}
          >
            <Send size={18} className={sending ? "animate-pulse" : ""} />
            {sending ? "Envoi..." : "Envoyer"}
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          **gras** | *italique* | `code` | [lien](url) | # Titre
        </p>
      </div>

      {/* Modal paramètres canal */}
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