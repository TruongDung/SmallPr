import { useMemo, useState } from 'react';
import { useLunarCalendarMonth } from '../../hooks/useLunarCalendarMonth';
import { useTasks } from '../../hooks/useTasks';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useT } from '../../store/i18n';
import type { LunarCalendarDay, Task } from '../../api/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad2 = (value: number) => String(value).padStart(2, '0');

const toYmd = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfMonthGrid = (date: Date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  return addDays(first, -first.getDay());
};

const taskDateKey = (task: Task) => String(task.due_date || '').slice(0, 10);

const formatMonth = (date: Date) => new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);

export const LunarMonthCalendar = () => {
  const t = useT();
  const [cursor, setCursor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const { tasks, isLoading: tasksLoading, error: tasksError } = useTasks(false);
  const { settings, isLoading: settingsLoading } = useUserSettings();
  const showLunar = settings?.show_lunar_dates_in_calendar !== false;
  const lunarQuery = useLunarCalendarMonth(cursor.getFullYear(), cursor.getMonth() + 1, showLunar);

  const lunarByDate = useMemo(() => {
    const map = new Map<string, LunarCalendarDay>();
    (lunarQuery.data ?? []).forEach((entry) => map.set(entry.date, entry));
    return map;
  }, [lunarQuery.data]);

  const tasksByDate = useMemo(
    () =>
      tasks.reduce((map, task) => {
        if (task.archived) return map;
        const key = taskDateKey(task);
        if (!key) return map;
        if (!map.has(key)) map.set(key, []);
        map.get(key)?.push(task);
        return map;
      }, new Map<string, Task[]>()),
    [tasks],
  );

  const days = useMemo(() => {
    const start = startOfMonthGrid(cursor);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [cursor]);

  const moveMonth = (offset: number) => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  if (tasksLoading || settingsLoading) {
    return (
      <p className="loading-state" aria-busy="true">
        {t('loading')}
      </p>
    );
  }

  if (tasksError) {
    return <p className="field-error">{t('dashboardErrorTitle')}</p>;
  }

  return (
    <section className="react-calendar-view" aria-labelledby="react-calendar-title">
      <header className="react-calendar-header">
        <button type="button" className="secondary" onClick={() => moveMonth(-1)}>
          &lt;
        </button>
        <h2 id="react-calendar-title">{formatMonth(cursor)}</h2>
        <button type="button" className="secondary" onClick={() => moveMonth(1)}>
          &gt;
        </button>
      </header>

      <div className="react-calendar-grid" role="grid">
        {WEEKDAYS.map((day) => (
          <div key={day} className="react-calendar-weekday" role="columnheader">
            {day}
          </div>
        ))}

        {days.map((date) => {
          const key = toYmd(date);
          const dayTasks = tasksByDate.get(key) ?? [];
          const lunar = showLunar ? lunarByDate.get(key) : null;
          const outsideMonth = date.getMonth() !== cursor.getMonth();

          return (
            <section
              key={key}
              className={`react-calendar-day${outsideMonth ? ' react-calendar-day-muted' : ''}`}
              role="gridcell"
            >
              <div className="react-calendar-day-header">
                <strong>{date.getDate()}</strong>
                {lunar?.label && <span className="react-lunar-label">{lunar.label}</span>}
              </div>

              {dayTasks.length > 0 && (
                <div className="react-calendar-task-list">
                  {dayTasks.slice(0, 3).map((task) => (
                    <span
                      key={task.id}
                      className={`react-calendar-task priority-${task.priority || 'medium'}`}
                      title={task.title}
                    >
                      {task.title}
                    </span>
                  ))}
                  {dayTasks.length > 3 && <span className="react-calendar-more">+{dayTasks.length - 3}</span>}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
};
