import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '../api/settingsApi';
import type { UserSettings } from '../api/types';

export const userSettingsQueryKey = ['settings'] as const;

export const useUserSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: userSettingsQueryKey,
    queryFn: getSettings,
  });

  const save = useMutation({
    mutationFn: (payload: UserSettings) => updateSettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(userSettingsQueryKey, settings);
      queryClient.invalidateQueries({ queryKey: ['lunar-calendar'] });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    saveSettings: save.mutateAsync,
    isSaving: save.isPending,
  };
};
