# 📱 DriverApp - Documentation complète

## 🎯 Vue d'ensemble

Le DriverApp est une application mobile sécurisée permettant aux chauffeurs d'accéder à leurs tournées de livraison sans nécessiter de compte utilisateur.

## 🔐 Sécurité

### Système de tokens
- ✅ **Token unique** généré pour chaque tournée
- ✅ **Expiration automatique** après 48 heures
- ✅ **Régénération possible** en cas de compromission
- ✅ **Vérification stricte** à chaque accès

### Protection des données
- Aucune donnée sensible de l'entreprise exposée
- Accès limité à la tournée spécifique
- Logs d'accès pour traçabilité
- Token révocable à tout moment

## 🚀 Fonctionnalités principales

### Pour le dispatcher

#### 1. Génération de lien sécurisé
```typescript
// Bouton "Vue Chauffeur" dans TourDetailView
- Génère automatiquement un token unique
- Crée une URL sécurisée avec expiration 48h
- Ouvre une modal de partage complète
```

#### 2. Modal de partage avancée
- **Copie rapide** du lien
- **Partage WhatsApp** avec message pré-rempli
- **Partage SMS** direct
- **Email** avec instructions complètes
- **QR Code** pour scan rapide
- **Régénération** du token si nécessaire

#### 3. Suivi en temps réel
- **Logs d'activité** : ouverture, GPS activé/désactivé, arrêts
- **Historique** des actions du chauffeur
- **Timestamps** précis de chaque événement
- **Analytics** sur l'utilisation

### Pour le chauffeur

#### 1. Interface mobile optimisée
- Design responsive adapté aux smartphones
- Gros boutons tactiles pour faciliter l'utilisation
- Navigation intuitive entre les arrêts
- Mode sombre automatique

#### 2. Tracking GPS
- Activation/désactivation simple
- Position envoyée intelligemment (50m ou 30s)
- Calcul automatique de la distance parcourue
- Mise à jour en temps réel sur la carte dispatcher

#### 3. Gestion des livraisons
- **Prochain arrêt** mis en évidence
- **Appel direct** au client (bouton tel:)
- **Navigation GPS** : Google Maps + Waze
- **Marquage statut** : Arrivé → Livré
- **Statistiques** : progression, distance, restants

#### 4. PWA (Progressive Web App)
- Installation possible sur l'écran d'accueil
- Fonctionne comme une app native
- Icône dédiée + splash screen
- Mode standalone (sans barre de navigation)

## 📊 Analytics & Monitoring

### Table `driver_access_logs`

#### Structure
```sql
CREATE TABLE driver_access_logs (
  id UUID PRIMARY KEY,
  tour_id UUID REFERENCES tours(id),
  driver_id UUID REFERENCES drivers(id),
  accessed_at TIMESTAMPTZ,
  action TEXT,
  metadata JSONB
);
```

#### Actions trackées
- `opened` : Lien ouvert par le chauffeur
- `gps_enabled` : GPS activé
- `gps_disabled` : GPS désactivé
- `stop_arrived` : Arrivée à un arrêt
- `stop_completed` : Livraison complétée

#### Utilisation
```typescript
// Logger une action
await supabase.from('driver_access_logs').insert({
  tour_id: tourId,
  driver_id: driverId,
  action: 'gps_enabled',
  metadata: { timestamp: new Date() }
});
```

## 🛠️ Installation & Configuration

### 1. Exécuter la migration SQL
```sql
-- Dans Supabase SQL Editor
-- Voir: sql_migration_security.sql
```

### 2. Installer les dépendances
```bash
npm install react-qr-code
```

### 3. Ajouter les fichiers
- `src/components/ShareDriverModal.tsx`
- `src/components/DriverAccessLogs.tsx`
- `src/pages/DriverApp.tsx` (mis à jour)
- `src/pages/TourDetailView.tsx` (mis à jour)
- `src/hooks/useTourData.ts` (mis à jour)
- `public/manifest.json`

### 4. Importer dans TourDetailView
```typescript
import ShareDriverModal from '../components/ShareDriverModal';
import DriverAccessLogs from '../components/DriverAccessLogs';
```

### 5. Créer les icônes PWA
Générez des icônes 192x192 et 512x512 :
- `public/icon-192.png`
- `public/icon-512.png`
- `public/icon-96.png`

### 6. Lier le manifest dans index.html
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#2563EB">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

## 📱 Workflow d'utilisation

### Côté dispatcher

1. **Créer une tournée** avec chauffeur et stops
2. **Ouvrir la tournée** dans TourDetailView
3. **Cliquer sur "Vue Chauffeur"** 🟣
4. **Modal s'ouvre** avec options de partage
5. **Choisir méthode** : WhatsApp, SMS, Email, QR
6. **Lien envoyé** au chauffeur

### Côté chauffeur

1. **Recevoir le lien** par SMS/WhatsApp
2. **Ouvrir dans navigateur** mobile
3. **Vérification automatique** du token
4. **Interface chargée** avec tous les arrêts
5. **Activer GPS** pour tracking
6. **Suivre les arrêts** un par un
7. **Marquer statuts** : Arrivé → Livré

## 🔄 Gestion des tokens

### Expiration automatique
- Durée : **48 heures** par défaut
- Affichage du temps restant dans la modal
- Alerte si le token a expiré

### Régénération
```typescript
// Depuis la modal de partage
const regenerateToken = async () => {
  const newToken = btoa(Math.random()...);
  const newExpiry = new Date();
  newExpiry.setHours(newExpiry.getHours() + 48);
  
  await supabase.from('tours').update({
    access_token: newToken,
    token_expires_at: newExpiry.toISOString()
  }).eq('id', tourId);
};
```

### Révocation
Deux méthodes :
1. **Régénérer** : ancien token invalidé automatiquement
2. **Supprimer** : mettre `access_token = NULL` en base

## 🎨 Personnalisation

### Modifier la durée d'expiration
```typescript
// Dans useTourData.ts et TourDetailView.tsx
const tokenExpiry = new Date();
tokenExpiry.setHours(tokenExpiry.getHours() + 72); // 72h au lieu de 48h
```

### Ajouter des actions trackées
```typescript
// Dans DriverApp.tsx
logAccess('custom_action', { 
  custom_field: 'value' 
});
```

### Personnaliser les messages de partage
```typescript
// Dans ShareDriverModal.tsx
const message = `Votre message personnalisé: ${driverUrl}`;
```

## 🐛 Debugging

### Logs console utiles
```
🔐 Vérification token...
📍 Tour ID: abc-123
🔑 Token reçu: dGVz...
📦 Tournée trouvée: Tournée Nord
✅ Token validé avec succès !
📊 Log: opened
```

### Erreurs communes

#### "Token invalide"
- Vérifier que le token en base correspond
- Vérifier l'expiration
- Régénérer un nouveau lien

#### "Clipboard API bloquée"
- Utilise automatiquement le fallback
- Pas d'action requise

#### "GPS non disponible"
- Vérifier les permissions navigateur
- Tester sur HTTPS uniquement
- Safari : Réglages du site web

## 📈 Métriques disponibles

Avec les logs d'accès, vous pouvez calculer :
- **Taux d'adoption** : % de chauffeurs qui ouvrent le lien
- **Temps moyen** entre ouverture et activation GPS
- **Taux de completion** : % de stops complétés
- **Performance** : temps moyen par livraison

## 🔒 Sécurité avancée

### Recommandations production

1. **Rate limiting** sur les endpoints
2. **Logs d'échec** d'authentification
3. **Alertes** sur activités suspectes
4. **Nettoyage automatique** des vieux logs (fonction SQL fournie)
5. **Backup** régulier de `driver_access_logs`

### Conformité RGPD

- Logs conservés 90 jours maximum
- Fonction de suppression fournie
- Pas de données personnelles sensibles
- Consentement implicite par usage

## 🎓 Formation chauffeurs

### Guide rapide à partager

**Comment utiliser l'app Sloti Driver ?**

1. 📱 Ouvrez le lien reçu par SMS
2. ✅ Autorisez la localisation
3. 🔵 Cliquez sur "Activer GPS"
4. 📍 Suivez les arrêts dans l'ordre
5. ✓ Marquez "Arrivé" puis "Livré"
6. 📞 Appelez le client si besoin
7. 🗺️ Utilisez Maps/Waze pour naviguer

## 🚀 Évolutions futures

### En développement
- [ ] Signature client à la livraison
- [ ] Photo de preuve
- [ ] Notes vocales
- [ ] Mode hors ligne avec sync
- [ ] Notifications push
- [ ] Widget d'accueil rapide

### Considéré
- [ ] Historique tournées chauffeur
- [ ] Statistiques personnelles
- [ ] Gamification (badges, objectifs)
- [ ] Chat avec dispatcher
- [ ] Scan codes-barres colis

## 📞 Support

En cas de problème :
1. Consulter les logs console (F12)
2. Vérifier la migration SQL
3. Tester en navigation privée
4. Vérifier les permissions GPS
5. Régénérer le lien si nécessaire

---

**Version**: 2.0  
**Dernière mise à jour**: 2025  
**Auteur**: Dimitri - Sloti