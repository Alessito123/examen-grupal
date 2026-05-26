const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schedules = await prisma.horario.findMany({
    include: { docente: true, curso: true, aula: true }
  });
  console.log("SUCCESSFULLY FETCHED SCHEDULES:");
  console.log("Count:", schedules.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
