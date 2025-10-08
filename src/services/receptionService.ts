import { Reception } from '../types';
import { getDb } from '../lib/db';

export const receptionService = {
  async getAll(): Promise<Reception[]> {
    try {
      const db = await getDb();
      const receptions = await db.getAll('receptions');
      return receptions.sort((a, b) => {
        // Trier par date puis par heure
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.hour - b.hour;
      });
    } catch (error) {
      console.error('Error fetching receptions:', error);
      return [];
    }
  },

  async create(data: Omit<Reception, 'id' | 'createdAt'>): Promise<Reception> {
    const db = await getDb();
    const newReception = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    await db.add('receptions', newReception);
    return newReception;
  },

  async update(id: string, updates: Partial<Reception>, userId: string): Promise<Reception> {
    const db = await getDb();
    const reception = await db.get('receptions', id);
    if (!reception) {
      throw new Error('Réception non trouvée');
    }
    const updatedReception = {
      ...reception,
      ...updates,
      updatedById: userId,
      updatedAt: new Date().toISOString()
    };
    await db.put('receptions', updatedReception);
    return updatedReception;
  },

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('receptions', id);
  }
};