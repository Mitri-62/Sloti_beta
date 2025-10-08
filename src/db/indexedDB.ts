import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Reception, User } from '../types';

interface PSECDatabase extends DBSchema {
  receptions: {
    key: string;
    value: Reception;
    indexes: {
      'by-date': string;
      'by-status': string;
      'by-company': string;
    };
  };
  users: {
    key: string;
    value: User;
    indexes: {
      'by-email': string;
      'by-company': string;
    };
  };
  sync_queue: {
    key: string;
    value: {
      action: string;
      data: any;
      timestamp: string;
    };
  };
}

export class LocalDB {
  private db: IDBPDatabase<PSECDatabase> | null = null;
  private readonly DB_NAME = 'psec_planning';
  private readonly DB_VERSION = 1;

  async init() {
    this.db = await openDB<PSECDatabase>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Receptions store
        const receptionStore = db.createObjectStore('receptions', { keyPath: 'id' });
        receptionStore.createIndex('by-date', 'date');
        receptionStore.createIndex('by-status', 'status');
        receptionStore.createIndex('by-company', 'companyId');

        // Users store
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('by-email', 'email', { unique: true });
        userStore.createIndex('by-company', 'companyId');

        // Sync queue store
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      },
    });
  }

  // Reception methods
  async addReception(reception: Reception): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.add('receptions', reception);
  }

  async getReceptions(): Promise<Reception[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAll('receptions');
  }

  async getReceptionsByDate(date: string): Promise<Reception[]> {
    if (!this.db) throw new Error('Database not initialized');
    const index = this.db.transaction('receptions').store.index('by-date');
    return index.getAll(date);
  }

  async updateReception(id: string, updates: Partial<Reception>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const reception = await this.db.get('receptions', id);
    if (!reception) throw new Error('Reception not found');
    await this.db.put('receptions', { ...reception, ...updates });
  }

  async deleteReception(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete('receptions', id);
  }

  // User methods
  async addUser(user: User): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.add('users', user);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    const index = this.db.transaction('users').store.index('by-email');
    return index.get(email);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const user = await this.db.get('users', id);
    if (!user) throw new Error('User not found');
    await this.db.put('users', { ...user, ...updates });
  }

  // Sync queue methods
  async addToSyncQueue(action: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.add('sync_queue', {
      action,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  async getSyncQueue(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAll('sync_queue');
  }

  async clearSyncQueue(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.clear('sync_queue');
  }
}