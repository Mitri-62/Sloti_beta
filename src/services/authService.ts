import { User } from '../types';
import { getDb } from '../lib/db';
import { SHA256 } from 'crypto-js';

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const db = await getDb();
    const index = db.transaction('users').store.index('by-email');
    const user = await index.get(email);

    if (!user) {
      throw new Error('Identifiants invalides');
    }

    const hashedPassword = SHA256(password).toString();
    if (hashedPassword !== user.password) {
      throw new Error('Identifiants invalides');
    }

    // Mettre à jour la dernière connexion
    user.lastActive = new Date().toISOString();
    await db.put('users', user);

    // Ne pas renvoyer le mot de passe
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  async register(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<User> {
    const db = await getDb();
    const index = db.transaction('users').store.index('by-email');
    const existingUser = await index.get(userData.email);

    if (existingUser) {
      throw new Error('Cet email est déjà utilisé');
    }

    const hashedPassword = SHA256(userData.password).toString();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const user: User = {
      id,
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'user',
      lastActive: now,
      createdAt: now
    };

    await db.add('users', user);

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
};