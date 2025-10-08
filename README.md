Gestion de l’authentification (Supabase)

1. Objectif

Assurer une expérience fluide pour l’utilisateur :
	•	Session persistante même après un changement d’onglet.
	•	Rafraîchissement automatique du token (refresh token).
	•	Synchronisation de l’état de connexion/déconnexion entre plusieurs onglets.
	•	Pas besoin de recharger la page manuellement.

⸻

2. Architecture

🔹 AuthContext.tsx
	•	Centralise la logique d’authentification.
	•	Expose user, isLoading, error, login, logout.
	•	Utilise Supabase Auth (supabase.auth) pour gérer la session.
	•	Rafraîchit automatiquement l’utilisateur via :
	•	supabase.auth.onAuthStateChange (écoute les événements SIGNED_IN / SIGNED_OUT).
	•	BroadcastChannel("supabase-auth") (propagation entre onglets).
	•	Vérification périodique avec setInterval (refresh silencieux des tokens).

🔹 Rafraîchissement auto (fix du problème)

Ajout de ce code :useEffect(() => {
  const interval = setInterval(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("❌ Erreur refresh session:", error);
    }
    if (data?.session?.user) {
      await checkUser();
    }
  }, 5 * 60 * 1000); // toutes les 5 min

  return () => clearInterval(interval);
}, [checkUser]);
Résultat : plus besoin de recharger la page, même après un passage prolongé sur un autre onglet.

Bonnes pratiques
	•	Toujours utiliser useAuth() pour accéder au user → pas d’appel direct à Supabase dans les composants.
	•	Côté UI : afficher un loader (isLoading) tant que la session n’est pas confirmée.
	•	Déconnexion propre : appeler supabase.auth.signOut() + nettoyer le contexte.

⸻

4. Points vérifiés ✅
	•	Multi-onglets : synchro OK grâce à BroadcastChannel.
	•	Retour après inactivité : refresh OK via setInterval.
	•	Navigation dans l’app : pas de perte de session.# Sloti_beta
