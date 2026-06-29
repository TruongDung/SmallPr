import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTask, deleteTask, listTasks, updateTask } from '../api/tasksApi';
import type { Task, TaskPayload } from '../api/types';

export const tasksQueryKey = (archived: boolean) => ['tasks', { archived }] as const;

export const useTasks = (archived = false) => {
  const queryClient = useQueryClient();
  const queryKey = tasksQueryKey(archived);

  const query = useQuery({
    queryKey,
    queryFn: () => listTasks(archived),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['tags'] });
  };

  const create = useMutation({
    mutationFn: (payload: TaskPayload) => createTask(payload),
    onSuccess: invalidateAll,
  });

  // Optimistic update used for status/archive toggles and drag-and-drop so the
  // board reacts instantly; we reconcile against the server on settle.
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TaskPayload }) => updateTask(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Task[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Task[]>(
          queryKey,
          previous.map((task) => (task.id === id ? { ...task, ...payload } : task)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: invalidateAll,
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: invalidateAll,
  });

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createTask: create.mutateAsync,
    updateTask: update.mutateAsync,
    deleteTask: remove.mutateAsync,
  };
};
