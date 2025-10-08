import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Créer l'utilisateur admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@psec.fr' },
    update: {},
    create: {
      email: 'admin@psec.fr',
      name: 'Administrateur',
      role: 'admin',
    },
  })

  // Créer quelques réceptions de test
  const today = new Date().toISOString().split('T')[0];
  
  const receptions = await Promise.all([
    prisma.reception.create({
      data: {
        date: today,
        hour: 8,
        minutes: 0,
        transporteur: 'MAZET',
        reference: 'MAZ001',
        status: 'pending',
        position: 1,
        createdById: admin.id,
      },
    }),
    prisma.reception.create({
      data: {
        date: today,
        hour: 9,
        minutes: 30,
        transporteur: 'NSF',
        reference: 'NSF002',
        status: 'confirmed',
        position: 1,
        createdById: admin.id,
      },
    }),
    prisma.reception.create({
      data: {
        date: today,
        hour: 14,
        minutes: 0,
        transporteur: 'LINEAGE',
        reference: 'LIN003',
        status: 'completed',
        position: 2,
        createdById: admin.id,
      },
    }),
  ])

  console.log({ admin, receptions })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })