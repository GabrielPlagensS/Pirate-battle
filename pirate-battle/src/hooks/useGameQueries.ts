import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getHistory, getRanking, saveMatch, type MatchMeta } from '../api/contracts';
import type { GameResult } from '../types/game';

export function useRanking(page: number) {
  return useQuery({ queryKey: ['ranking', page], queryFn: () => getRanking(page), staleTime: 5000, retry: 1, refetchOnWindowFocus: true });
}

export function useHistory(page: number) {
  return useQuery({ queryKey: ['history', page], queryFn: () => getHistory(page), staleTime: 5000, retry: 1, refetchOnWindowFocus: true });
}

export function useSaveMatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ result, meta }: { result: GameResult; meta: MatchMeta }) => saveMatch(result, meta),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['ranking'] }),
        client.invalidateQueries({ queryKey: ['history'] })
      ]);
    }
  });
}
