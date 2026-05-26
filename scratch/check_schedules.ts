import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const schedules = await prisma.horario.findMany({
    include: { docente: true, curso: true, aula: true }
  });
  console.log("SCHEDULES IN DATABASE:");
  console.log(JSON.stringify(schedules, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
