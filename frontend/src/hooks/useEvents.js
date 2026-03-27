import { useQuery, useQueryClient } from '@tanstack/react-query';
import API from '../api';

export const useEvents = (userId, options = {}) => {
  return useQuery({
    queryKey: ['events', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const res = await API.get(`/events/calendar/${userId}`);
      return res.data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    ...options,
  });
};

export const useAllEvents = (options = {}) => {
  return useQuery({
    queryKey: ['events-all'],
    queryFn: async () => {
      const res = await API.get('/events');
      return res.data || [];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    ...options,
  });
};

export const useCategories = (options = {}) => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await API.get('/categories');
      return res.data || [];
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useInvalidateEvents = () => {
  const queryClient = useQueryClient();
  return {
    invalidateUserEvents: (userId) => {
      queryClient.invalidateQueries({
        queryKey: ['events', userId],
      });
    },
    invalidateAllEvents: () => {
      queryClient.invalidateQueries({
        queryKey: ['events-all'],
      });
    },
    invalidateCategories: () => {
      queryClient.invalidateQueries({
        queryKey: ['categories'],
      });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: ['events'],
      });
      queryClient.invalidateQueries({
        queryKey: ['categories'],
      });
    },
  };
};
