import * as trpcNext from '@trpc/server/adapters/next';
import { appRouter } from '../../../../backend/trpc/router';
import { createContext } from '../../../../backend/trpc/context';

// Exportar el handler de tRPC para Next.js
export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext,
  onError:
    process.env.NODE_ENV === 'development'
      ? ({ path, error }: { path?: string; error: any }) => {
          console.error(`❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`);
        }
      : undefined,
});
