// src/components/UsersListSidebar.tsx - VERSION DEBUG
import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { Users, Search, Loader, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar } from "./Avatar";

interface OnlineUser {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'away' | 'offline';
  last_seen: string;
}

export default function UsersListSidebar() {
  const { user } = useAuth();
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.company_id) {
      console.log("❌ UsersListSidebar: Pas de company_id", { user });
      return;
    }

    console.log("✅ UsersListSidebar: Chargement des utilisateurs", {
      userId: user.id,
      companyId: user.company_id
    });

    loadUsers();
    updatePresence();

    // Mettre à jour la présence toutes les 30 secondes (au lieu de 5)
    const presenceInterval = setInterval(() => {
      updatePresence();
    }, 30000);

    // Recharger les utilisateurs toutes les 60 secondes (au lieu de 5)
    const usersInterval = setInterval(() => {
      loadUsers();
    }, 60000);

    // Écouter les changements de présence en temps réel
    const channel = supabase
      .channel('user_presence_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `company_id=eq.${user.company_id}`
        },
        (payload) => {
          console.log("🔄 Changement de présence détecté", payload);
          loadUsers(); // Recharger immédiatement
        }
      )
      .subscribe();

    return () => {
      clearInterval(presenceInterval);
      clearInterval(usersInterval);
      supabase.removeChannel(channel);
    };
  }, [user?.company_id]);

  const loadUsers = async () => {
    if (!user?.company_id) return;

    try {
      console.log("🔍 Requête SQL: Récupération des utilisateurs");
      console.log("   - company_id:", user.company_id);
      console.log("   - user_id (à exclure):", user.id);

      // Récupérer les utilisateurs de MA company avec leur présence
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          company_id
        `)
        .eq('company_id', user.company_id)
        .neq('id', user.id);

      if (error) throw error;

      // Ensuite, récupérer la présence pour chaque utilisateur
      const userIds = data?.map(u => u.id) || [];
      
      console.log("🔍 Recherche de présence pour:", userIds);
      
      const { data: presenceData, error: presenceError } = await supabase
        .from('user_presence')
        .select('user_id, status, last_seen')
        .in('user_id', userIds);
      
      console.log("📡 Résultat requête présence:", {
        success: !presenceError,
        error: presenceError ? (presenceError as any).message : null,
        count: presenceData?.length || 0,
        data: presenceData
      });

      console.log("📊 Résultat de la requête:", {
        success: !error,
        error: error ? (error as any).message : null,
        count: data?.length || 0,
        data: data
      });

      if (error) throw error;
      if (presenceError) {
        console.error("❌ Erreur présence:", presenceError);
      }

      // Créer un map de présence
      const presenceMap = new Map(
        presenceData?.map(p => [p.user_id, p]) || []
      );

      console.log("🗺️ Presence map:", presenceMap);

      // Vérification supplémentaire côté client
      const usersWithPresence = (data as any[])
        ?.filter((u: any) => {
          const isValid = u.company_id === user.company_id;
          if (!isValid) {
            console.warn("⚠️ Utilisateur avec mauvaise company_id:", u);
          }
          return isValid;
        })
        ?.map((u: any) => {
          const presence = presenceMap.get(u.id);
          const status = getStatus(presence?.last_seen);
          console.log(`👤 ${u.name}:`, {
            id: u.id,
            status,
            last_seen: presence?.last_seen,
            presence
          });
          
          return {
            id: u.id,
            name: u.name || u.email?.split('@')[0] || 'Utilisateur',
            email: u.email,
            status,
            last_seen: presence?.last_seen || new Date().toISOString()
          };
        }) || [];

      console.log("✅ Utilisateurs finaux:", usersWithPresence);

      // Trier par statut (online en premier) puis par nom
      usersWithPresence.sort((a, b) => {
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return a.name.localeCompare(b.name);
      });

      setUsers(usersWithPresence);
    } catch (error) {
      console.error('❌ Erreur chargement utilisateurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePresence = async () => {
    if (!user?.id) return;

    try {
      console.log("💚 Mise à jour présence:", {
        userId: user.id,
        companyId: user.company_id
      });

      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          company_id: user.company_id,
          status: 'online',
          last_seen: new Date().toISOString()
        });
      
      console.log("✅ Présence mise à jour");
    } catch (error) {
      console.error('❌ Erreur mise à jour présence:', error);
    }
  };

  const getStatus = (lastSeen: string | undefined): 'online' | 'away' | 'offline' => {
    if (!lastSeen) {
      console.log("⚠️ Pas de last_seen");
      return 'offline';
    }
    
    const now = new Date().getTime();
    const lastSeenTime = new Date(lastSeen).getTime();
    const diffMinutes = (now - lastSeenTime) / 1000 / 60;

    console.log("⏰ Calcul statut:", {
      now: new Date(now).toISOString(),
      lastSeen: new Date(lastSeenTime).toISOString(),
      diffMinutes: diffMinutes.toFixed(2),
      status: diffMinutes < 2 ? 'online' : diffMinutes < 10 ? 'away' : 'offline'
    });

    if (diffMinutes < 2) return 'online';
    if (diffMinutes < 10) return 'away';
    return 'offline';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'En ligne';
      case 'away': return 'Absent';
      case 'offline': return 'Hors ligne';
      default: return 'Inconnu';
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = users.filter(u => u.status === 'online').length;

  console.log("🎨 Rendu:", {
    loading,
    totalUsers: users.length,
    filteredUsers: filteredUsers.length,
    onlineCount,
    searchQuery
  });

  return (
    <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-600 dark:text-slate-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
              Équipe
            </h2>
          </div>
          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
            {onlineCount} en ligne
          </span>
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

      {/* Liste des utilisateurs */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={24} className="animate-spin text-gray-400 dark:text-slate-500" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {searchQuery ? "Aucun utilisateur trouvé" : "Aucun autre utilisateur"}
            </p>
            {/* DEBUG INFO */}
            <div className="mt-4 text-xs text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-900 p-2 rounded">
              <p>Company ID: {user?.company_id}</p>
              <p>Total users: {users.length}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredUsers.map((u) => (
              <Link
                key={u.id}
                to={`/app/chat/dm/${u.id}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
              >
                <div className="relative">
                  <Avatar username={u.name} size="sm" />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(u.status)} border-2 border-white dark:border-slate-800 rounded-full`}></div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {u.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                    {getStatusText(u.status)}
                  </p>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MessageSquare size={16} className="text-gray-400 dark:text-slate-500" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
        <p className="text-xs text-center text-gray-500 dark:text-slate-400">
          {users.length} membre{users.length > 1 ? 's' : ''} dans l'équipe
        </p>
      </div>
    </div>
  );
}