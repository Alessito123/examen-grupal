import { trpc } from '../utils/trpc';

export const useFetchDocentes = () => {
  const query = trpc.docentes.getAll.useQuery();

  return {
    docentes: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
};
