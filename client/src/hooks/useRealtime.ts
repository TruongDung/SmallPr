import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';

// Connects to the same origin (proxied to Express in dev). The server scopes
// task events to the logged-in user's room based on the session, so we only
// connect once authenticated and invalidate the tasks cache on any task event.
export const useRealtime = (enabled: boolean) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const socket: Socket = io({
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    const invalidateTasks = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    const invalidateSprints = () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    };

    ['task:created', 'task:updated', 'task:deleted'].forEach((event) => {
      socket.on(event, invalidateTasks);
    });

    ['sprint:created', 'sprint:updated', 'sprint:deleted'].forEach((event) => {
      socket.on(event, invalidateSprints);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled, queryClient]);
};
