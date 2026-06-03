// Shared application state for the Task Manager frontend.
// All modules read/write this single source of truth.
(function () {
  const SAVED_VIEW_KEY = 'task-manager-current-view';
  const REMEMBER_ME_KEY = 'task-manager-remember-me';
  const VIEW_NAMES = new Set(['dashboard', 'notes', 'tasks', 'archived', 'tags', 'weather', 'credit-cards', 'admin']);

  const state = {
    // Auth
    currentUser: null,
    currentMode: 'login',
    registrationStartedAt: Date.now(),
    registrationInteractionCount: 0,

    // View / navigation
    currentView: (() => {
      const saved = localStorage.getItem(SAVED_VIEW_KEY);
      return VIEW_NAMES.has(saved) ? saved : 'tasks';
    })(),

    // Preferences
    currentLanguage: localStorage.getItem('task-manager-language') || 'en',
    currentTimezone: null,
    currentTheme: localStorage.getItem('task-manager-theme') || 'light',

    // Data
    tasks: [],
    tags: [],
    users: [],
    auditLogs: [],
    auditLogPage: 1,
    auditLogSearchTimer: null,
    currentTagFilter: '',

    // Pending actions (used by delete-confirm / modal flows)
    pendingDeleteTaskId: null,
    pendingDeleteUser: null,
    pendingDeleteTag: null,
    pendingDeleteCard: null,
    pendingDeleteFastAccessLink: null,
    pendingDeleteNote: null,
    pendingEditTag: null,
    pendingEditTask: null,
    pendingPreviewTask: null,
    pendingAdminUser: null,
    preparedAttachment: null,
    preparedEditAttachment: null,
    removeEditAttachment: false,

    // Realtime
    realtimeSocket: null,
    pendingTaskRefresh: null,
    pendingNoteRefresh: null,

    // Toast
    statusToastTimer: null,
    reminderAlertPreviousFocus: null,

    // Reminder timers (Map of taskId -> timer)
    reminderTimers: new Map(),

    // Constants
    MAX_ATTACHMENT_BYTES: 5 * 1024 * 1024,
    MAX_TASK_TEXT_LENGTH: 10000,
    AUDIT_LOG_PAGE_SIZE: 25,
    DAILY_QUOTE_API_URL: '/api/daily-quote',
    DAILY_QUOTE_CACHE_KEY: 'task-manager-daily-quote',
    WEATHER_CACHE_PREFIX: 'task-manager-weather-cities',
    DEFAULT_DAILY_QUOTE: {
      text: "Loading today's quote...",
      author: '',
    },
    SAVED_VIEW_KEY,
    REMEMBER_ME_KEY,
    VIEW_NAMES,
  };

  // ---- Derived helpers ----
  const isAdminUser = () => state.currentUser?.username === 'admin';
  const isImpersonating = () => Boolean(state.currentUser?.impersonator);

  const getBrowserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    } catch (error) { return 'America/New_York'; }
  };

  const getActiveTimezone = () =>
    state.currentTimezone || state.currentUser?.timezone || getBrowserTimezone();

  const getSavedView = () => state.currentView;

  const setCurrentView = (view, { persist = true } = {}) => {
    if (!state.VIEW_NAMES.has(view)) return;
    state.currentView = view;
    if (persist) localStorage.setItem(SAVED_VIEW_KEY, view);
  };

  const getReminderStorageKey = (task) =>
    `task-reminder-alerted-${task.id}-${task.reminder_at}`;

  const getDailyQuoteDateKey = () => new Date().toISOString().slice(0, 10);

  const getLegacySavedWeatherCitiesKey = () =>
    `${state.WEATHER_CACHE_PREFIX}-${state.currentUser?.id || 'guest'}`;

  window.AppState = {
    state,
    isAdminUser,
    isImpersonating,
    getBrowserTimezone,
    getActiveTimezone,
    getSavedView,
    setCurrentView,
    getReminderStorageKey,
    getDailyQuoteDateKey,
    getLegacySavedWeatherCitiesKey,
  };
})();
