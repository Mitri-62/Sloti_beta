// Configuration de l'environnement
const config = {
  // API URL basée sur l'environnement
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  
  // URL de base du site
  baseUrl: import.meta.env.VITE_BASE_URL || 'http://localhost:5173',
  
  // Environnement actuel
  environment: import.meta.env.MODE,
  
  // Version de l'application
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Configuration de l'authentification
  auth: {
    tokenKey: 'psec_token',
    refreshTokenKey: 'psec_refresh_token',
  },
  
  // Configuration de la base de données
  database: {
    name: 'psec_planning',
    version: 1,
  }
};

export default config;