// src/components/ChatSidebar.tsx - VERSION CORRIGÉE SANS RÉCURSION
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { Hash, Plus, Loader, Lock, Globe, Settings, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

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

  useEffect(() => {
    loadChannels();
  }, [user?.id]);

  const loadChannels = async () => {
    if (!user?.id) return;

    try {
      // ✅ Étape 1 : Récupérer les IDs des canaux dont l'utilisateur est membre
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

      // ✅ Étape 2 : Récupérer les détails des canaux
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
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Canaux
          </h2>
          <button
            onClick={() => toast.info("Créer un canal (à implémenter)")}
            className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white"
            title="Créer un canal"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            !channelId ? 'bg-blue-500' : 'bg-slate-700'
          }`}>
            <Hash size={18} />
          </div>
          <span className="font-medium text-sm">Chat général</span>
        </Link>
      </div>

      {/* Séparateur */}
      <div className="px-4 py-2">
        <div className="border-t border-slate-700"></div>
      </div>

      {/* Liste des canaux */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={24} className="animate-spin text-slate-500" />
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <Hash size={24} className="text-slate-500" />
            </div>
            <p className="text-sm text-slate-400 mb-2">
              {searchQuery ? "Aucun canal trouvé" : "Aucun canal"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => toast.info("Créer un canal")}
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
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
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  channelId === channel.id ? 'bg-blue-500' : 'bg-slate-700 group-hover:bg-slate-600'
                }`}>
                  {getChannelIcon(channel.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{channel.name}</span>
                    {channel.unread_count && channel.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                        {channel.unread_count}
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

      {/* Footer utilisateur */}
      <div className="p-3 border-t border-slate-700 bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name || user?.email?.split("@")[0]}
            </p>
            <p className="text-xs text-slate-400 truncate">
              En ligne
            </p>
          </div>
          <button
            onClick={() => toast.info("Paramètres")}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white"
            title="Paramètres"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}