import { getDb } from './db';

const migrations = [
  // Migration initiale
  async function migration_001() {
    const db = await getDb();
    await db.exec(`
      -- Table des utilisateurs
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        lastActive TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );

      -- Table des réceptions
      CREATE TABLE IF NOT EXISTS receptions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        hour INTEGER NOT NULL,
        minutes INTEGER NOT NULL,
        transporteur TEXT NOT NULL,
        reference TEXT,
        status TEXT NOT NULL,
        notes TEXT,
        position INTEGER NOT NULL,
        createdById TEXT NOT NULL,
        updatedById TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT,
        FOREIGN KEY (createdById) REFERENCES users(id),
        FOREIGN KEY (updatedById) REFERENCES users(id)
      );

      -- Index pour optimiser les requêtes
      CREATE INDEX IF NOT EXISTS idx_receptions_date ON receptions(date);
      CREATE INDEX IF NOT EXISTS idx_receptions_status ON receptions(status);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
  }
];

export async function runMigrations() {
  console.log('Exécution des migrations...');
  
  for (const migration of migrations) {
    try {
      await migration();
      console.log(`Migration ${migration.name} exécutée avec succès`);
    } catch (error) {
      console.error(`Erreur lors de la migration ${migration.name}:`, error);
      throw error;
    }
  }
  
  console.log('Migrations terminées');
}