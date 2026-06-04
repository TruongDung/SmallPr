import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTag, deleteTag, listTags, updateTag } from '../api/tagsApi';

export const useTags = () => {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tags'] });

  const query = useQuery({
    queryKey: ['tags'],
    queryFn: listTags,
  });

  const create = useMutation({
    mutationFn: (name: string) => createTag(name),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateTag(id, name),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return {
    tags: query.data ?? [],
    isLoading: query.isLoading,
    createTag: create.mutateAsync,
    updateTag: update.mutateAsync,
    deleteTag: remove.mutateAsync,
  };
};
