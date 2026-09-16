import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

let prisma;

declareGlobalPrisma();

function declareGlobalPrisma() {
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
  } else {
    if (!global.__prisma) {
      global.__prisma = new PrismaClient({
        log: [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
      });
    }
    prisma = global.__prisma;
  }

  prisma.$on('error', (e) => {
    logger.error({ error: e }, 'Prisma database error');
  });
}

export { prisma };
export default prisma;
