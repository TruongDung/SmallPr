import { useQuery } from '@tanstack/react-query';
import { getLunarCalendarMonth } from '../api/lunarCalendarApi';

export const lunarCalendarMonthQueryKey = (year: number, month: number) => ['lunar-calendar', { year, month }] as const;

export const useLunarCalendarMonth = (year: number, month: number, enabled: boolean) =>
  useQuery({
    queryKey: lunarCalendarMonthQueryKey(year, month),
    queryFn: () => getLunarCalendarMonth(year, month),
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
  });
