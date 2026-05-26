import { trpc } from '../utils/trpc';

export const useFetchHorarios = () => {
  const query = trpc.horarios.getAll.useQuery();

  return {
    horarios: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
};
