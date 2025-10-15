// src/components/ChatSidebar.tsx - VERSION CORRIGÉE AVEC DARK MODE ET LAYOUT
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { Hash, Plus, Loader, Lock, Globe, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import CreateChannelModal from "./CreateChannelModal";

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'external';
  description?: string;
  unread_count?: number;
}

export default function ChatSidebar() {
  const { user } = useAuth();
  const { channelId } = useParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadChannels();
  }, [user?.id]);

  const loadChannels = async () => {
    if (!user?.id) return;

    try {
      const { data: memberData, error: memberError } = await supabase
        .from("channel_members")
        .select("channel_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        setChannels([]);
        setLoading(false);
        return;
      }

      const channelIds = memberData.map(m => m.channel_id);

      const { data: channelsData, error: channelsError } = await supabase
        .from("channels")
        .select("*")
        .in("id", channelIds)
        .order("name");

      if (channelsError) throw channelsError;

      setChannels(channelsData || []);
    } catch (error) {
      console.error("Erreur chargement canaux:", error);
      toast.error("Erreur lors du chargement des canaux");
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'private': return <Lock size={16} className="flex-shrink-0 opacity-70" />;
      case 'external': return <Globe size={16} className="flex-shrink-0 opacity-70" />;
      default: return <Hash size={16} className="flex-shrink-0 opacity-70" />;
    }
  };

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* ✅ SIDEBAR AVEC DARK MODE - Hauteur 100% du container parent */}
      <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
              Canaux
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
              title="Créer un canal"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Chat général */}
        <div className="px-2 py-2">
          <Link
            to="/app/chat"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
              !channelId
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              !channelId ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-700'
            }`}>
              <Hash size={18} />
            </div>
            <span className="font-medium text-sm">Chat général</span>
          </Link>
        </div>

        {/* Séparateur */}
        <div className="px-4 py-2">
          <div className="border-t border-gray-200 dark:border-slate-700"></div>
        </div>

        {/* Liste des canaux */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader size={24} className="animate-spin text-gray-400 dark:text-slate-500" />
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <Hash size={24} className="text-gray-400 dark:text-slate-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
                {searchQuery ? "Aucun canal trouvé" : "Aucun canal"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                >
                  Créer votre premier canal
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredChannels.map((channel) => (
                <Link
                  key={channel.id}
                  to={`/app/chat/channel/${channel.id}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
                    channelId === channel.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    channelId === channel.id ? 'bg-blue-500' : 'bg-gray-200 dark:bg-slate-700 group-hover:bg-gray-300 dark:group-hover:bg-slate-600'
                  }`}>
                    {getChannelIcon(channel.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{channel.name}</span>
                      {channel.unread_count && channel.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                          {channel.unread_count > 9 ? '9+' : channel.unread_count}
                        </span>
                      )}
                    </div>
                    {channel.description && (
                      <p className="text-xs opacity-60 truncate mt-0.5">
                        {channel.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ✅ FOOTER SIMPLE SANS INDICATEURS */}
        <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {channels.length} canal{channels.length > 1 ? 'aux' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Modal de création de canal */}
      {showCreateModal && (
        <CreateChannelModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadChannels();
          }}
        />
      )}
    </>
  );
}