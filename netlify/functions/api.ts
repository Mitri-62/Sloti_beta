import express, { Router } from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { Server } from 'socket.io';
import { Reception, User } from '../../src/types';

const api = express();
const router = Router();

// Middleware
api.use(cors());
api.use(express.json());

// Routes
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Réceptions
router.get('/receptions', async (req, res) => {
  try {
    // Ici nous utiliserons la base de données
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/receptions', async (req, res) => {
  try {
    const reception = req.body;
    // Sauvegarder dans la base de données
    res.json(reception);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Utilisateurs
router.get('/users', async (req, res) => {
  try {
    // Récupérer les utilisateurs
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

api.use('/api/', router);

// Websocket setup pour les fonctions Netlify
const wsClients = new Set();

export const handler = serverless(api);