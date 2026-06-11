import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSprint,
  deleteSprint,
  listSprints,
  updateSprint,
} from '../api/sprintsApi';
import type { SprintPayload } from '../api/types';

export const sprintsQueryKey = ['sprints'] as const;

export const useSprints = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: sprintsQueryKey });
  };

  const query = useQuery({
    queryKey: sprintsQueryKey,
    queryFn: listSprints,
  });

  const create = useMutation({
    mutationFn: (payload: SprintPayload) => createSprint(payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SprintPayload }) =>
      updateSprint(id, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteSprint(id),
    onSuccess: () => {
      invalidate();
      // Sprint deletion NULLs sprint_id on tasks — invalidate task cache too.
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return {
    sprints: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createSprint: create.mutateAsync,
    updateSprint: update.mutateAsync,
    deleteSprint: remove.mutateAsync,
  };
};
