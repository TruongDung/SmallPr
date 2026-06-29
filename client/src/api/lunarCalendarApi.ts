import { request } from './http';
import type { LunarCalendarDay } from './types';

export const getLunarCalendarMonth = (year: number, month: number) =>
  request<{ days: LunarCalendarDay[] }>(`/api/lunar-calendar/month?year=${year}&month=${month}`).then((r) => r.days);
