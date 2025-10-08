import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Reception, User } from '../types';
import { SHA256 } from 'crypto-js';

interface PSECDatabase extends DBSchema {
  users: {
    key: string;
    value: User;
    indexes: {
      'by-email': string;
    };
  };
  receptions: {
    key: string;
    value: Reception;
    indexes: {
      'by-date': string;
      'by-status': string;
    };
  };
}

let db: IDBPDatabase<PSECDatabase> | null = null;

export async function getDb() {
  if (db) return db;

  db = await openDB<PSECDatabase>('psec_planning', 1, {
    upgrade(db) {
      // Users store
      const userStore = db.createObjectStore('users', { keyPath: 'id' });
      userStore.createIndex('by-email', 'email', { unique: true });

      // Receptions store
      const receptionStore = db.createObjectStore('receptions', { keyPath: 'id' });
      receptionStore.createIndex('by-date', 'date');
      receptionStore.createIndex('by-status', 'status');
    },
  });

  return db;
}

// Initialiser l'utilisateur admin par défaut
export async function initializeAdminUser() {
  const db = await getDb();
  const adminEmail = 'admin@psec.fr';

  try {
    const existingAdmin = await db.get('users', 'admin');
    if (!existingAdmin) {
      const hashedPassword = SHA256('admin123').toString();
      await db.add('users', {
        id: 'admin',
        email: adminEmail,
        name: 'Administrateur',
        role: 'admin',
        password: hashedPassword,
        lastActive: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      console.log('Admin user created');
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
}