import { PrismaClient } from '@prisma/client';

// Para evitar múltiples instancias de Prisma en desarrollo (Hot Reload de Next.js)
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const basePrisma =
  global.prisma ||
  new PrismaClient({
    log: ['query', 'warn', 'error'], // Opcional: logs de consultas, advertencias y errores
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = basePrisma;
}

const prisma = basePrisma.$extends({
  result: {
    docente: {
      antiguedad: {
        needs: { fechaNombramiento: true, fechaContrato: true },
        compute(docente) {
          const date = docente.fechaNombramiento || docente.fechaContrato;
          if (!date) return 0;
          
          const birthDate = new Date(date);
          const today = new Date();
          
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          return Math.max(0, age);
        }
      }
    }
  }
});

export default prisma;