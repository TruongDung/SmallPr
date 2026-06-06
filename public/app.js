// ---- Module imports ----
// Reusable utilities extracted to js/utils.js — available as window.AppUtils
const U = window.AppUtils;
// HTTP client extracted to js/apiClient.js
const apiClient = window.ApiClient.create({ state: window.AppState.state });
// Toast notifications extracted to js/ui/toast.js
// `t` is late-bound: the wrapper only calls t() at runtime, after it's defined below.
const toast = window.ToastModule.create({
  state: window.AppState.state,
  t: (key, values) => t(key, values),
});

// ---- DOM refs ----
const authSection = document.getElementById('auth-section');
const taskSection = document.getElementById('task-section');
const adminSection = document.getElementById('admin-section');
const creditCardSection = document.getElementById('credit-card-section');
const notesSection = document.getElementById('notes-section');
const dashboardSection = document.getElementById('dashboard-section');
const appContainer = document.querySelector('.container');
const userArea = document.getElementById('user-area');
const floatingAddTask = document.getElementById('floating-add-task');
const taskSubtabNav = document.getElementById('task-subtab-nav');
const taskSubtabs = [...document.querySelectorAll('[data-task-tab]')];
const themeToggle = document.getElementById('theme-toggle');
const authForm = document.getElementById('auth-form');
const authEmailField = document.getElementById('auth-email-field');
const authEmailInput = document.getElementById('auth-email');
const addTaskModal = document.getElementById('add-task-modal');
const taskForm = document.getElementById('task-form');
const cancelAddTask = document.getElementById('cancel-add-task');
const saveAddTask = document.querySelector('#task-form button[type="submit"]');
const tagForm = document.getElementById('tag-form');
const tagManager = document.querySelector('.tag-manager');
const taskHeader = document.querySelector('.task-header');
const weatherSection = document.getElementById('weather-section');
const openAddUserModalButton = document.getElementById('open-add-user-modal');
const impersonateUserSelect = document.getElementById('impersonate-user-select');
const adminUserModal = document.getElementById('admin-user-modal');
const adminUserModalTitle = document.getElementById('admin-user-modal-title');
const adminUserForm = document.getElementById('admin-user-form');
const adminNameInput = document.getElementById('admin-name');
const adminUsernameInput = document.getElementById('admin-username');
const adminEmailInput = document.getElementById('admin-email');
const adminStatusInput = document.getElementById('admin-status');
const adminPasswordField = document.getElementById('admin-password-field');
const adminPasswordInput = document.getElementById('admin-password');
const adminUserFormError = document.getElementById('admin-user-form-error');
const cancelAdminUser = document.getElementById('cancel-admin-user');
const saveAdminUser = document.getElementById('save-admin-user');
const userSettingsModal = document.getElementById('user-settings-modal');
const userSettingsTitle = document.getElementById('user-settings-title');
const userSettingsForm = document.getElementById('user-settings-form');
const settingsNameInput = document.getElementById('settings-name');
const settingsEmailInput = document.getElementById('settings-email');
const settingsTimezoneInput = document.getElementById('settings-timezone');
const timezoneSuggestions = document.getElementById('timezone-suggestions');
const settingsLanguageInput = document.getElementById('settings-language');
const userSettingsFormError = document.getElementById('user-settings-form-error');
const cancelUserSettings = document.getElementById('cancel-user-settings');
const saveUserSettings = document.getElementById('save-user-settings');
const passwordSettingsTitle = document.getElementById('password-settings-title');
const passwordSettingsForm = document.getElementById('password-settings-form');
const settingsCurrentPasswordInput = document.getElementById('settings-current-password');
const settingsNewPasswordInput = document.getElementById('settings-new-password');
const passwordSettingsFormError = document.getElementById('password-settings-form-error');
const savePasswordSettings = document.getElementById('save-password-settings');
const taskList = document.getElementById('task-list');
const calendarSection = document.getElementById('calendar-section');
const tagList = document.getElementById('tag-list');
const userList = document.getElementById('user-list');
const auditLogList = document.getElementById('audit-log-list');
const refreshAuditLog = document.getElementById('refresh-audit-log');
const auditLogPagination = document.getElementById('audit-log-pagination');
const auditLogPrevious = document.getElementById('audit-log-previous');
const auditLogNext = document.getElementById('audit-log-next');
const auditLogPageInfo = document.getElementById('audit-log-page-info');
const auditLogSearchInput = document.getElementById('audit-log-search-input');
const authMessage = document.getElementById('auth-message');
const tagMessage = document.getElementById('tag-message');
const adminMessage = document.getElementById('admin-message');
const showLogin = document.getElementById('show-login');
const showSignup = document.getElementById('show-signup');
const logoutButton = document.getElementById('logout-button');
const sendSummaryEmailButton = document.getElementById('send-summary-email');
const exportExcelButton = document.getElementById('export-excel');
const exportPdfButton = document.getElementById('export-pdf');
const exportWordButton = document.getElementById('export-word');
const taskSearchInput = document.getElementById('task-search-input');
const clearTaskSearch = document.getElementById('clear-task-search');
const taskPriorityInput = document.getElementById('task-priority');
const taskStatusInput = document.getElementById('task-status');
const taskTagInput = document.getElementById('task-tag');
const taskTagSuggestions = document.getElementById('task-tag-suggestions');
const taskDueDateInput = document.getElementById('task-due-date');
const taskReminderInput = document.getElementById('task-reminder');
const taskRecurringCheckbox = document.getElementById('task-recurring');
const recurrenceOptions = document.getElementById('recurrence-options');
const taskRecurrencePattern = document.getElementById('task-recurrence-pattern');
const taskRecurrenceInterval = document.getElementById('task-recurrence-interval');
const dailyOptions = document.getElementById('daily-options');
const weeklyOptions = document.getElementById('weekly-options');
const addRelatedTasksList = document.getElementById('add-related-tasks-list');
const addRelatedTasksCount = document.getElementById('add-related-tasks-count');
const addRelatedTasksSearch = document.getElementById('add-related-tasks-search');
const addRelatedTasksResults = document.getElementById('add-related-tasks-results');
const addRelatedTasksHint = document.getElementById('add-related-tasks-hint');
const editTaskRecurringCheckbox = document.getElementById('edit-task-recurring');
const editRecurrenceOptions = document.getElementById('edit-recurrence-options');
const editTaskRecurrencePattern = document.getElementById('edit-task-recurrence-pattern');
const editTaskRecurrenceInterval = document.getElementById('edit-task-recurrence-interval');
const editDailyOptions = document.getElementById('edit-daily-options');
const editWeeklyOptions = document.getElementById('edit-weekly-options');
const taskAttachmentInput = document.getElementById('task-attachment');
const passwordInput = document.getElementById('password');
const togglePasswordButton = document.getElementById('toggle-password');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const deleteConfirmTitle = document.getElementById('delete-confirm-title');
const deleteConfirmMessage = document.getElementById('delete-confirm-message');
const confirmDeleteYes = document.getElementById('confirm-delete-yes');
const confirmDeleteNo = document.getElementById('confirm-delete-no');
const editTagModal = document.getElementById('edit-tag-modal');
const editTagForm = document.getElementById('edit-tag-form');
const editTagTitle = document.getElementById('edit-tag-title');
const editTagNameInput = document.getElementById('edit-tag-name-input');
const editTagError = document.getElementById('edit-tag-error');
const cancelEditTag = document.getElementById('cancel-edit-tag');
const resetPasswordModal = document.getElementById('reset-password-modal');
const resetPasswordForm = document.getElementById('reset-password-form');
const resetPasswordInput = document.getElementById('reset-password-input');
const resetPasswordError = document.getElementById('reset-password-error');
const cancelResetPassword = document.getElementById('cancel-reset-password');
const editTaskModal = document.getElementById('edit-task-modal');
const editTaskForm = document.getElementById('edit-task-form');
const editTaskTitle = document.getElementById('edit-task-title');
const editTaskTitleInput = document.getElementById('edit-task-title-input');
const editTaskPriorityInput = document.getElementById('edit-task-priority-input');
const editTaskStatusInput = document.getElementById('edit-task-status-input');
const editTaskTagInput = document.getElementById('edit-task-tag-input');
const editTaskTagSuggestions = document.getElementById('edit-task-tag-suggestions');
const editTaskDescriptionInput = document.getElementById('edit-task-description-input');
const editTaskCommentInput = document.getElementById('edit-task-comment-input');
const editTaskDueDateInput = document.getElementById('edit-task-due-date-input');
const editTaskReminderInput = document.getElementById('edit-task-reminder-input');
const editTaskAttachmentInput = document.getElementById('edit-task-attachment-input');
const editCurrentAttachment = document.getElementById('edit-current-attachment');
const editRelatedTasksList = document.getElementById('edit-related-tasks-list');
const editRelatedTasksCount = document.getElementById('edit-related-tasks-count');
const editRelatedTasksSearch = document.getElementById('edit-related-tasks-search');
const editRelatedTasksResults = document.getElementById('edit-related-tasks-results');
const editRelatedTasksHint = document.getElementById('edit-related-tasks-hint');
const editTitleError = document.getElementById('edit-title-error');
const editDescriptionError = document.getElementById('edit-description-error');
const editAttachmentError = document.getElementById('edit-attachment-error');
const editFormError = document.getElementById('edit-form-error');
const cancelEditTask = document.getElementById('cancel-edit-task');
const previewTaskModal = document.getElementById('preview-task-modal');
const previewTaskTitle = document.getElementById('preview-task-title');
const previewTaskDescription = document.getElementById('preview-task-description');
const previewRelatedTasksList = document.getElementById('preview-related-tasks-list');
const previewRelatedTasksCount = document.getElementById('preview-related-tasks-count');
const previewRelatedTasksSearch = document.getElementById('preview-related-tasks-search');
const previewRelatedTasksResults = document.getElementById('preview-related-tasks-results');
const previewRelatedTasksHint = document.getElementById('preview-related-tasks-hint');
const previewTaskCommentDisplay = document.getElementById('preview-task-comment-display');
const previewTaskCommentInput = document.getElementById('preview-task-comment-input');
const taskActivityTitle = document.getElementById('task-activity-title');
const taskActivityTabs = Array.from(document.querySelectorAll('[data-activity-filter]'));
const taskActivityList = document.getElementById('task-activity-list');
const editPreviewTask = document.getElementById('edit-preview-task');
const sendPreviewTaskEmail = document.getElementById('send-preview-task-email');
const deletePreviewTask = document.getElementById('delete-preview-task');
const closePreviewTask = document.getElementById('close-preview-task');
const attachmentPreviewModal = document.getElementById('attachment-preview-modal');
const attachmentPreviewTitle = document.getElementById('attachment-preview-title');
const attachmentPreviewImage = document.getElementById('attachment-preview-image');
const attachmentPreviewFrame = document.getElementById('attachment-preview-frame');
const openAttachmentPreview = document.getElementById('open-attachment-preview');
const closeAttachmentPreview = document.getElementById('close-attachment-preview');
const reminderAlertModal = document.getElementById('reminder-alert-modal');
const reminderAlertTitle = document.getElementById('reminder-alert-title');
const reminderAlertMessage = document.getElementById('reminder-alert-message');
const reminderAlertTime = document.getElementById('reminder-alert-time');
const reminderAlertOk = document.getElementById('reminder-alert-ok');
const statusToast = document.getElementById('status-toast');
const uploadProgressOverlay = document.getElementById('upload-progress-overlay');
const uploadProgressTitle = document.getElementById('upload-progress-title');
const uploadProgressText = document.getElementById('upload-progress-text');
const uploadProgressFill = document.getElementById('upload-progress-fill');
const uploadProgressPercent = document.getElementById('upload-progress-percent');

let currentMode = 'login';
let currentUser = null;
let registrationStartedAt = Date.now();
let registrationInteractionCount = 0;
const SAVED_VIEW_KEY = 'task-manager-current-view';
const REMEMBER_ME_KEY = 'task-manager-remember-me';
const rememberMeCheckbox = document.getElementById('remember-me');
const rememberMeText = document.getElementById('remember-me-text');
const VIEW_NAMES = new Set(['dashboard', 'notes', 'tasks', 'calendar', 'archived', 'tags', 'weather', 'credit-cards', 'admin']);
const isAdminUser = () => currentUser?.username === 'admin';
const isImpersonating = () => Boolean(currentUser?.impersonator);
const getSavedView = () => {
  const savedView = localStorage.getItem(SAVED_VIEW_KEY);
  return VIEW_NAMES.has(savedView) ? savedView : 'dashboard';
};
let currentView = getSavedView();
let currentLanguage = localStorage.getItem('task-manager-language') || 'en';
let currentTimezone = null;
let currentTheme = localStorage.getItem('task-manager-theme') || 'light';
let currentTagFilter = '';
let tasks = [];
let tags = [];
let users = [];
let auditLogs = [];
let auditLogPage = 1;
const AUDIT_LOG_PAGE_SIZE = 25;
let auditLogSearchTimer = null;
let pendingAdminUser = null;
const reminderTimers = new Map();
let pendingDeleteTaskId = null;
let pendingDeleteUser = null;
let pendingDeleteTag = null;
let pendingDeleteCard = null;
let pendingDeleteFastAccessLink = null;
let pendingDeleteNote = null;
let pendingDeleteTransaction = null;
let pendingEditTag = null;
let pendingResetPasswordUser = null;
let pendingEditTask = null;
let pendingPreviewTask = null;
let activeActivityFilter = 'all';
let pendingAddTask = { related_task_ids: [], related_tasks: [] };
let statusToastTimer = null;
let isPasswordSettingsSaving = false;
let reminderAlertPreviousFocus = null;
let preparedAttachment = null;
let preparedEditAttachment = null;
let removeEditAttachment = false;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_TASK_TEXT_LENGTH = 10000;
const DEFAULT_TASK_PRIORITY = 'low';

const { translations } = window.AppI18n;
const t = window.AppI18n.createTranslator(() => currentLanguage);

const setText = (selector, value) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
};

const setIconButtonLabel = (button, label) => {
  button.setAttribute('aria-label', label);
  button.title = label;
};

const setActionIconButton = (button, label, icon) => {
  button.classList.add('task-action-icon');
  button.textContent = icon;
  button.setAttribute('aria-label', label);
  button.title = label;
};

const trackEvent = (eventName, properties = {}) => {
  window.AppMonitoring?.captureEvent?.(eventName, properties);
};

const captureMonitoringError = (error, context = {}) => {
  window.AppMonitoring?.captureError?.(error, context);
};

const identifyMonitoringUser = () => {
  window.AppMonitoring?.setUser?.(currentUser);
};

const setNavButtonContent = (button, label, icon) => {
  button.textContent = '';
  const iconSpan = document.createElement('span');
  iconSpan.className = 'nav-icon';
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.textContent = icon;
  const labelSpan = document.createElement('span');
  labelSpan.className = 'nav-label';
  labelSpan.textContent = label;
  button.append(iconSpan, labelSpan);
  button.setAttribute('aria-label', label);
  button.title = label;
};

const applyTheme = () => {
  const isDark = currentTheme === 'dark';
  document.body.classList.toggle('theme-dark', isDark);
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute('aria-label', isDark ? t('switchToLightMode') : t('switchToDarkMode'));
  themeToggle.querySelector('.theme-toggle-text').textContent = isDark ? t('lightMode') : t('darkMode');
};

const toggleTheme = () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('task-manager-theme', currentTheme);
  applyTheme();
};

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const applyTranslations = () => {
  document.documentElement.lang = currentLanguage;
  document.title = t('appTitle');
  setText('h1', t('appTitle'));
  setText('.app-subtitle', t('appSubtitle'));
  applyTheme();
  showLogin.textContent = t('login');
  showSignup.textContent = t('signup');
  if (rememberMeText) rememberMeText.textContent = t('rememberMe');
  setText('label[for="username"]', t('username'));
  setText('label[for="auth-email"]', t('email'));
  setText('label[for="password"]', t('password'));
  togglePasswordButton.setAttribute(
    'aria-label',
    passwordInput.type === 'password' ? t('showPassword') : t('hidePassword')
  );
  setText('#auth-form button[type="submit"]', t('submit'));
  setIconButtonLabel(sendSummaryEmailButton, t('sendEmail'));
  setIconButtonLabel(exportExcelButton, t('exportExcel'));
  setIconButtonLabel(exportPdfButton, t('exportPdf'));
  if (exportWordButton) setIconButtonLabel(exportWordButton, t('exportWord'));
  logoutButton.textContent = t('logout');
  if (userSettingsTitle) userSettingsTitle.textContent = t('userSettings');
  if (passwordSettingsTitle) passwordSettingsTitle.textContent = t('changePassword');
  setText('label[for="settings-name"]', t('name'));
  setText('label[for="settings-email"]', t('email'));
  setText('label[for="settings-timezone"]', t('timezone'));
  setText('label[for="settings-language"]', t('language'));
  setText('label[for="settings-current-password"]', t('currentPassword'));
  setText('label[for="settings-new-password"]', t('newPassword'));
  cancelUserSettings?.setAttribute('aria-label', t('cancel'));
  if (cancelUserSettings) cancelUserSettings.title = t('cancel');
  saveUserSettings?.setAttribute('aria-label', t('save'));
  if (saveUserSettings) saveUserSettings.title = t('save');
  savePasswordSettings?.setAttribute('aria-label', t('save'));
  if (savePasswordSettings) savePasswordSettings.title = t('save');
  setText('#weather-title', t('weather'));
  const weatherCityInput = document.getElementById('weather-city-input');
  if (weatherCityInput) weatherCityInput.placeholder = t('cityPlaceholder');
  setText('#weather-form button[type="submit"]', t('addCity'));
  creditCardModule.applyTranslations();
  notesModule.applyTranslations();
  dashboardModule.applyTranslations();
  setText('label[for="task-search-input"]', t('searchTasks'));
  taskSearchInput.placeholder = t('searchTasksPlaceholder');
  clearTaskSearch.setAttribute('aria-label', t('clearSearch'));
  clearTaskSearch.title = t('clearSearch');
  setText('label[for="task-title"]', `${t('title')} ${t('max20')}`);
  setText('label[for="task-priority"]', t('priority'));
  updatePriorityOptions(taskPriorityInput);
  setText('label[for="task-status"]', t('status'));
  updateStatusOptions(taskStatusInput);
  setText('label[for="task-tag"]', t('tag'));
  taskTagInput.placeholder = t('tagPlaceholder');
  setText('#tag-manager-title', t('manageTags'));
  setText('#tasks-subtab', t('tasks'));
  setText('#calendar-subtab', t('calendar'));
  setText('#archived-subtab', t('archive'));
  setText('#tag-subtab', t('tag'));
  setText('#calendar-title', t('calendar'));
  setText('#calendar-today', t('calendarToday'));
  setText('[data-calendar-view="today"]', t('calendarToday'));
  setText('[data-calendar-view="week"]', t('calendarWeek'));
  setText('[data-calendar-view="month"]', t('calendarMonth'));
  setText('#calendar-deadlines-title', t('upcomingDeadlines'));
  setText('#calendar-overdue-title', t('overdueTasks'));
  setText('label[for="tag-name"]', t('tagName'));
  document.getElementById('tag-name').placeholder = t('tagPlaceholder');
  setText('#tag-form button[type="submit"]', t('addTag'));
  editTagTitle.textContent = t('renameTag');
  setText('label[for="edit-tag-name-input"]', t('tagName'));
  editTagNameInput.placeholder = t('tagPlaceholder');
  cancelEditTag.className = 'task-action-icon secondary';
  cancelEditTag.textContent = '×';
  cancelEditTag.setAttribute('aria-label', t('cancel'));
  cancelEditTag.title = t('cancel');
  const saveEditTagButton = document.getElementById('save-edit-tag');
  if (saveEditTagButton) {
    saveEditTagButton.className = 'task-action-icon';
    saveEditTagButton.textContent = '✓';
    saveEditTagButton.setAttribute('aria-label', t('save'));
    saveEditTagButton.title = t('save');
  }
  setText('#reset-password-title', t('resetPassword'));
  setText('label[for="reset-password-input"]', t('newPassword'));
  cancelResetPassword.setAttribute('aria-label', t('cancel'));
  cancelResetPassword.title = t('cancel');
  const saveResetPasswordButton = document.getElementById('save-reset-password');
  if (saveResetPasswordButton) {
    saveResetPasswordButton.setAttribute('aria-label', t('save'));
    saveResetPasswordButton.title = t('save');
  }
  setText('label[for="task-description"]', `${t('taskDetail')} ${t('max500')}`);
  document.getElementById('task-description').setAttribute('data-placeholder', t('taskDetailPlaceholder'));
  setText('label[for="task-due-date"]', t('dueDate'));
  setText('label[for="task-reminder"]', t('dateTimeAlert'));
  setText('label[for="task-attachment"]', t('uploadFile'));
  setText('#add-task-title', t('addTask'));
  cancelAddTask.className = 'secondary modal-text-action';
  cancelAddTask.textContent = t('cancel');
  cancelAddTask.setAttribute('aria-label', t('cancel'));
  cancelAddTask.title = t('cancel');
  saveAddTask.className = 'modal-text-action modal-text-action-primary';
  saveAddTask.textContent = t('addTask');
  saveAddTask.setAttribute('aria-label', t('addTask'));
  saveAddTask.title = t('addTask');
  setText('#add-related-tasks-label', t('relatedTasks'));
  if (addRelatedTasksSearch) addRelatedTasksSearch.placeholder = t('relatedTasksSearchPlaceholder');
  if (addRelatedTasksHint) addRelatedTasksHint.textContent = t('relatedTasksHint');
  document.querySelectorAll('[data-related-trigger]').forEach((button) => {
    button.setAttribute('aria-label', t('addRelatedTask'));
    button.title = t('addRelatedTask');
  });
  editTaskTitle.textContent = t('editTaskTitle');
  updatePreviewTaskModalTitle();
  setText('#edit-related-tasks-label', t('relatedTasks'));
  if (editRelatedTasksSearch) editRelatedTasksSearch.placeholder = t('relatedTasksSearchPlaceholder');
  if (editRelatedTasksHint) editRelatedTasksHint.textContent = t('relatedTasksHint');
  setText('#preview-related-tasks-label', t('relatedTasks'));
  if (previewRelatedTasksSearch) previewRelatedTasksSearch.placeholder = t('relatedTasksSearchPlaceholder');
  if (previewRelatedTasksHint) previewRelatedTasksHint.textContent = t('relatedTasksViewOnlyHint');
  if (taskActivityTitle) {
    const icon = taskActivityTitle.querySelector('[aria-hidden="true"]');
    taskActivityTitle.textContent = '';
    if (icon) taskActivityTitle.append(icon, ' ');
    taskActivityTitle.append(t('activity'));
  }
  taskActivityTabs.forEach((button) => {
    const filter = button.dataset.activityFilter;
    const labels = {
      all: t('activityAll'),
      comments: t('activityComments'),
      history: t('activityHistoryTab'),
      worklog: t('activityWorkLogTab'),
    };
    button.textContent = labels[filter] || button.textContent;
  });
  setText('label[for="preview-task-comment-input"]', t('comment'));
  previewTaskCommentInput.setAttribute('data-placeholder', t('commentPlaceholder'));
  setActionIconButton(sendPreviewTaskEmail, t('sendEmail'), '✉');
  setActionIconButton(editPreviewTask, t('edit'), '✎');
  setActionIconButton(deletePreviewTask, t('delete'), '🗑');
  setActionIconButton(closePreviewTask, t('close'), '×');
  reminderAlertOk.textContent = t('ok');
  setText('.reminder-alert-kicker', t('dateTimeAlert'));
  setText('label[for="edit-task-title-input"]', `${t('title')} ${t('max20')}`);
  setText('label[for="edit-task-priority-input"]', t('priority'));
  updatePriorityOptions(editTaskPriorityInput);
  setText('label[for="edit-task-status-input"]', t('status'));
  updateStatusOptions(editTaskStatusInput);
  setText('label[for="edit-task-tag-input"]', t('tag'));
  editTaskTagInput.placeholder = t('tagPlaceholder');
  setText('label[for="edit-task-description-input"]', `${t('taskDetail')} ${t('max500')}`);
  editTaskDescriptionInput.setAttribute('data-placeholder', t('taskDetailPlaceholder'));
  setText('label[for="edit-task-comment-input"]', t('addComment'));
  editTaskCommentInput.setAttribute('data-placeholder', t('commentPlaceholder'));
  setText('label[for="edit-task-due-date-input"]', t('dueDate'));
  setText('label[for="edit-task-reminder-input"]', t('dateTimeAlert'));
  setText('label[for="edit-task-attachment-input"]', t('uploadFile'));
  renderEditAttachmentState();
  setActionIconButton(cancelEditTask, t('cancel'), '×');
  setActionIconButton(document.getElementById('save-edit-task'), t('save'), '✓');
  setText('#admin-section h2', t('manageUsers'));
  setText('#open-add-user-modal', t('addUser'));
  if (impersonateUserSelect) {
    impersonateUserSelect.setAttribute('aria-label', t('impersonateUser'));
    const placeholder = impersonateUserSelect.querySelector('option[value=""]');
    if (placeholder) placeholder.textContent = t('impersonate');
  }
  adminUserModalTitle.textContent = pendingAdminUser ? t('editUser') : t('addUser');
  setText('label[for="admin-name"]', t('name'));
  setText('label[for="admin-username"]', t('username'));
  setText('label[for="admin-email"]', t('email'));
  setText('label[for="admin-status"]', t('userStatus'));
  const enabledOption = adminStatusInput?.querySelector('option[value="enabled"]');
  const disabledOption = adminStatusInput?.querySelector('option[value="disabled"]');
  if (enabledOption) enabledOption.textContent = t('userEnabledStatus');
  if (disabledOption) disabledOption.textContent = t('userDisabledStatus');
  setText('label[for="admin-password"]', t('password'));
  cancelAdminUser.setAttribute('aria-label', t('cancel'));
  cancelAdminUser.title = t('cancel');
  saveAdminUser.setAttribute('aria-label', pendingAdminUser ? t('save') : t('addUser'));
  saveAdminUser.title = pendingAdminUser ? t('save') : t('addUser');
  setText('.user-table th:nth-child(1)', t('username'));
  setText('.user-table th:nth-child(2)', t('name'));
  setText('.user-table th:nth-child(3)', t('email'));
  setText('.user-table th:nth-child(4)', t('userStatus'));
  setText('.user-table th:nth-child(5)', t('tasks'));
  setText('.user-table th:nth-child(6)', t('notes'));
  setText('.user-table th:nth-child(7)', t('actions'));
  setText('#audit-log-title', t('auditLog'));
  setText('label[for="audit-log-search-input"]', t('searchAuditLog'));
  if (auditLogSearchInput) auditLogSearchInput.placeholder = t('searchAuditLog');
  setText('#refresh-audit-log', t('refresh'));
  setText('#audit-log-previous', t('previousPage'));
  setText('#audit-log-next', t('nextPage'));
  setText('.audit-log-table th:nth-child(1)', t('time'));
  setText('.audit-log-table th:nth-child(2)', t('actor'));
  setText('.audit-log-table th:nth-child(3)', t('actions'));
  setText('.audit-log-table th:nth-child(4)', t('target'));
  setText('.audit-log-table th:nth-child(5)', t('owner'));
  setText('.audit-log-table th:nth-child(6)', t('summary'));
  confirmDeleteNo.className = 'task-action-icon secondary';
  confirmDeleteNo.textContent = '×';
  confirmDeleteNo.setAttribute('aria-label', t('no'));
  confirmDeleteNo.title = t('no');
  confirmDeleteYes.className = 'task-action-icon danger';
  confirmDeleteYes.textContent = '✓';
  confirmDeleteYes.setAttribute('aria-label', t('yes'));
  confirmDeleteYes.title = t('yes');
  if (currentUser) renderUserArea();
  if (currentUser) setActiveTaskSubtab();
  if (currentUser) renderTags(tags);
  if (currentUser && (currentView === 'tasks' || currentView === 'archived')) renderTasks(tasks);
  if (currentUser && currentView === 'calendar') calendarModule.render();
  if (currentUser && currentView === 'weather') weatherModule.render();
  if (currentUser && currentView === 'credit-cards') creditCardModule.render();
  if (currentUser && currentView === 'admin') renderUsers(users);
  if (currentUser && currentView === 'admin') renderAuditLogs(auditLogs);
};

const richText = window.RichTextModule.create({ escapeHtml });
const {
  getRichEditorLength,
  getRichEditorValue,
  getRichTextPlainText,
  hasRichTextMarkup,
  renderStoredRichText,
  sanitizeRichText,
  setRichEditorValue,
  setupRichTextEditors,
  syncChecklistItem,
} = richText;

const taskHelpers = window.TasksModule.create({
  t,
  getRichTextPlainText,
  getDefaultWeeklyOptions: () => weeklyOptions,
});
const {
  closePickerAfterTodaySelection,
  formatDateEST,
  formatDateTimeLocalValue,
  formatLocalDateTime,
  getSelectedWeekdays,
  setSelectedWeekdays,
  sortTasksByPriority,
  statusLabel,
  syncRecurrenceOptions,
  taskMatchesSearch,
  taskStatus,
  updatePriorityOptions,
  updateStatusOptions,
  priorityLabel,
} = taskHelpers;

const updateTaskSearchState = () => {
  clearTaskSearch.classList.toggle('hidden', !taskSearchInput.value.trim());
};

const getTaskDueDateKey = (task) => String(task?.due_date || '').slice(0, 10);

const getTodayDateKey = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

const isTaskOverdue = (task) => {
  const dueDate = getTaskDueDateKey(task);
  return Boolean(dueDate && dueDate < getTodayDateKey() && taskStatus(task) !== 'done');
};

const savePreviewChecklistField = async (field, container) => {
  if (!pendingPreviewTask) return;
  const value = sanitizeRichText(container.innerHTML);
  pendingPreviewTask[field] = value;
  const result = await updateTask(pendingPreviewTask.id, { [field]: value });
  if (!result?.error && result?.task) {
    pendingPreviewTask = result.task;
  }
};

const getPreviewTaskModalTitle = (task) => String(task?.title || '').trim() || t('previewTaskTitle');

const updatePreviewTaskModalTitle = () => {
  if (!previewTaskTitle) return;
  previewTaskTitle.textContent = getPreviewTaskModalTitle(pendingPreviewTask);
};

const getActivityActor = () => currentUser?.name || currentUser?.username || 'User';

const getActivityInitials = (name) => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  const initials = words.length > 1
    ? `${words[0][0]}${words[words.length - 1][0]}`
    : String(words[0] || 'U').slice(0, 2);
  return initials.toUpperCase();
};

const formatActivityWhen = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((startOfToday - startOfDate) / 86400000);
  if (days === 0) return t('today');
  if (days === 1) return t('yesterday');
  if (days > 1 && days < 7) return t('daysAgo', { count: days });
  return formatLocalDateTime(value);
};

const formatWorkLogDuration = (minutes) => {
  const total = Number(minutes) || 0;
  const hours = Math.floor(total / 60);
  const remainingMinutes = total % 60;
  if (hours && remainingMinutes) return `${hours}h ${remainingMinutes}m`;
  if (hours) return `${hours}h`;
  return `${remainingMinutes}m`;
};

const getTaskActivityItems = (task) => {
  if (!task) return [];
  const actor = getActivityActor();
  const createdAt = task.created_at || task.createdAt;
  const updatedAt = task.updated_at || task.updatedAt;
  const items = [];

  if (createdAt) {
    items.push({
      type: 'history',
      actor,
      when: formatActivityWhen(createdAt),
      message: t('activityCreatedWorkItem'),
      badge: t('activityHistory'),
    });
  }

  if (updatedAt && updatedAt !== createdAt) {
    items.push({
      type: 'history',
      actor,
      when: formatActivityWhen(updatedAt),
      message: t('activityChangedStatus'),
      badge: t('activityHistory'),
      diff: {
        from: t('todo').toUpperCase(),
        to: statusLabel(taskStatus(task)).toUpperCase(),
      },
    });
  }

  if (task.comment && getRichTextPlainText(task.comment).trim()) {
    items.push({
      type: 'comments',
      actor,
      when: formatActivityWhen(updatedAt || createdAt),
      message: t('activityCommented'),
      badge: t('activityComment'),
      html: renderStoredRichText(task.comment),
    });
  }

  if (Number(task.time_spent_minutes) > 0) {
    items.push({
      type: 'worklog',
      actor,
      when: formatActivityWhen(updatedAt || createdAt),
      message: t('activityLoggedWork', { duration: formatWorkLogDuration(task.time_spent_minutes) }),
      badge: t('activityWorkLog'),
    });
  }

  return items;
};

const renderTaskActivity = () => {
  if (!taskActivityList) return;
  const items = getTaskActivityItems(pendingPreviewTask)
    .filter((item) => activeActivityFilter === 'all' || item.type === activeActivityFilter);

  taskActivityList.innerHTML = '';

  taskActivityTabs.forEach((tab) => {
    const isActive = tab.dataset.activityFilter === activeActivityFilter;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'task-activity-empty';
    empty.textContent = t('activityEmpty');
    taskActivityList.append(empty);
    return;
  }

  items.forEach((item) => {
    const entry = document.createElement('article');
    entry.className = `task-activity-item task-activity-${item.type}`;

    const avatar = document.createElement('div');
    avatar.className = 'task-activity-avatar';
    avatar.textContent = getActivityInitials(item.actor);

    const body = document.createElement('div');
    body.className = 'task-activity-body';

    const message = document.createElement('p');
    message.className = 'task-activity-message';
    const actor = document.createElement('strong');
    actor.textContent = item.actor;
    message.append(actor, ` ${item.message}`);

    const when = document.createElement('p');
    when.className = 'task-activity-when';
    when.textContent = item.when;

    const badge = document.createElement('span');
    badge.className = 'task-activity-badge';
    badge.textContent = item.badge;

    const meta = document.createElement('div');
    meta.className = 'task-activity-meta';
    meta.append(when, badge);

    body.append(message, meta);

    if (item.diff) {
      const diff = document.createElement('div');
      diff.className = 'task-activity-diff';
      diff.innerHTML = `<span>${escapeHtml(item.diff.from)}</span><span aria-hidden="true">→</span><span>${escapeHtml(item.diff.to)}</span>`;
      body.append(diff);
    }

    if (item.html) {
      const comment = document.createElement('div');
      comment.className = 'task-activity-comment';
      comment.innerHTML = item.html;
      openRichTextLinksWithModifier(comment);
      body.append(comment);
    }

    entry.append(avatar, body);
    taskActivityList.append(entry);
  });
};

const relatedTasksModule = window.RelatedTasksModule.create({
  elements: {
    addList: addRelatedTasksList,
    addCount: addRelatedTasksCount,
    addSearch: addRelatedTasksSearch,
    addResults: addRelatedTasksResults,
    editList: editRelatedTasksList,
    editCount: editRelatedTasksCount,
    editSearch: editRelatedTasksSearch,
    editResults: editRelatedTasksResults,
    previewList: previewRelatedTasksList,
    previewCount: previewRelatedTasksCount,
    previewSearch: previewRelatedTasksSearch,
    previewResults: previewRelatedTasksResults,
  },
  getTasks: () => tasks,
  getAddTask: () => pendingAddTask,
  getEditTask: () => pendingEditTask,
  getPreviewTask: () => pendingPreviewTask,
  setAddTask: (task) => { pendingAddTask = task; },
  setEditTask: (task) => { pendingEditTask = task; },
  setPreviewTask: (task) => { pendingPreviewTask = task; },
  statusLabel,
  t,
  updateTask: (...args) => updateTask(...args),
  showStatusToast: (...args) => showStatusToast(...args),
});
const {
  getRelatedTaskIds,
  hideResults: hideRelatedTaskResults,
  render: renderRelatedTaskPicker,
  showResults: showRelatedTaskResults,
} = relatedTasksModule;

const calendarModule = window.CalendarModule.create({
  t,
  getTasks: () => tasks,
  taskStatus,
  updateTask: (...args) => updateTask(...args),
  showPreviewTaskModal: (...args) => showPreviewTaskModal(...args),
  showEditTaskModal: (...args) => showEditTaskModal(...args),
});

const isPdfAttachment = (task) => {
  const type = String(task?.attachment_type || '').toLowerCase();
  const name = String(task?.attachment_name || '').toLowerCase();
  return type === 'application/pdf' || name.endsWith('.pdf');
};

const isImageAttachment = (task) => {
  const type = String(task?.attachment_type || '').toLowerCase();
  const name = String(task?.attachment_name || '').toLowerCase();
  return type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
};

const attachAttachmentPreviewHandler = (link, task) => {
  if (!isPdfAttachment(task) && !isImageAttachment(task)) return;

  link.removeAttribute('download');
  link.addEventListener('click', (event) => {
    event.preventDefault();
    showAttachmentPreview(task);
  });
};

const openRichTextLinksWithModifier = (container) => {
  container.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || !container.contains(link)) return;

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      window.open(link.href, '_blank', 'noopener,noreferrer');
    }
  });
};

const readAttachmentFile = (file, onProgress = () => {}) => new Promise((resolve, reject) => {
  if (!file) {
    resolve(null);
    return;
  }

  const reader = new FileReader();
  reader.onprogress = (event) => {
    if (!event.lengthComputable) return;
    onProgress(Math.min(90, (event.loaded / event.total) * 90));
  };
  reader.onload = () => {
    onProgress(90);
    resolve({
      name: file.name,
      type: file.type || 'application/octet-stream',
      data: reader.result,
      size: file.size,
    });
  };
  reader.onerror = () => reject(new Error('Unable to read attachment'));
  reader.readAsDataURL(file);
});

const fileFromClipboard = (clipboardData) => {
  if (!clipboardData?.items) return null;
  const item = [...clipboardData.items].find((entry) => entry.kind === 'file');
  const file = item?.getAsFile();
  if (!file) return null;

  if (file.name) return file;

  const extension = (file.type.split('/')[1] || 'bin').replace('jpeg', 'jpg');
  return new File([file], `pasted-attachment.${extension}`, { type: file.type || 'application/octet-stream' });
};

const handleTaskAttachmentChange = async () => {
  const attachmentError = document.getElementById('attachment-error');
  attachmentError.classList.add('hidden');
  preparedAttachment = null;

  const attachmentFile = taskAttachmentInput.files[0] || null;
  if (!attachmentFile) return;

  if (attachmentFile.size > MAX_ATTACHMENT_BYTES) {
    taskAttachmentInput.value = '';
    attachmentError.textContent = t('attachmentTooLarge');
    attachmentError.classList.remove('hidden');
    return;
  }

  try {
    showUploadProgress();
    preparedAttachment = await readAttachmentFile(attachmentFile, setUploadProgress);
    setUploadProgress(100);
  } catch (error) {
    taskAttachmentInput.value = '';
    attachmentError.textContent = error.message;
    attachmentError.classList.remove('hidden');
  } finally {
    setTimeout(hideUploadProgress, 250);
  }
};

const handleEditTaskAttachmentChange = async () => {
  editAttachmentError.classList.add('hidden');
  preparedEditAttachment = null;
  removeEditAttachment = false;

  const attachmentFile = editTaskAttachmentInput.files[0] || null;
  if (!attachmentFile) {
    renderEditAttachmentState();
    return;
  }

  if (attachmentFile.size > MAX_ATTACHMENT_BYTES) {
    editTaskAttachmentInput.value = '';
    editAttachmentError.textContent = t('attachmentTooLarge');
    editAttachmentError.classList.remove('hidden');
    renderEditAttachmentState();
    return;
  }

  try {
    showUploadProgress();
    preparedEditAttachment = await readAttachmentFile(attachmentFile, setUploadProgress);
    setUploadProgress(100);
  } catch (error) {
    editTaskAttachmentInput.value = '';
    editAttachmentError.textContent = error.message;
    editAttachmentError.classList.remove('hidden');
  } finally {
    renderEditAttachmentState();
    setTimeout(hideUploadProgress, 250);
  }
};

const getReminderStorageKey = (task) => `task-reminder-alerted-${task.id}-${task.reminder_at}`;

const clearReminderTimers = () => {
  reminderTimers.forEach((timerId) => clearTimeout(timerId));
  reminderTimers.clear();
};

const hideReminderAlert = () => {
  reminderAlertModal.classList.add('hidden');
  if (reminderAlertPreviousFocus && document.contains(reminderAlertPreviousFocus)) {
    reminderAlertPreviousFocus.focus();
  }
  reminderAlertPreviousFocus = null;
};

const showTaskReminder = (task) => {
  localStorage.setItem(getReminderStorageKey(task), 'true');
  reminderAlertPreviousFocus = document.activeElement;
  reminderAlertTitle.textContent = task.title || t('reminderTitle');
  reminderAlertMessage.textContent = t('taskReminderNow', { title: task.title });
  reminderAlertTime.textContent = task.reminder_at ? formatLocalDateTime(task.reminder_at) : '';
  reminderAlertTime.classList.toggle('hidden', !task.reminder_at);
  reminderAlertModal.classList.remove('hidden');
  reminderAlertOk.focus();
};

const scheduleTaskReminders = (loadedTasks) => {
  clearReminderTimers();

  loadedTasks.forEach((task) => {
    if (!task.reminder_at || taskStatus(task) === 'done') return;
    if (localStorage.getItem(getReminderStorageKey(task))) return;

    const reminderTime = new Date(task.reminder_at).getTime();
    if (Number.isNaN(reminderTime)) return;

    const delay = reminderTime - Date.now();
    if (delay <= 0) {
      showTaskReminder(task);
      return;
    }

    const timerId = setTimeout(() => {
      showTaskReminder(task);
      reminderTimers.delete(task.id);
    }, delay);

    reminderTimers.set(task.id, timerId);
  });
};

const isTaskWorkspaceView = () => ['tasks', 'calendar', 'archived', 'tags'].includes(currentView);

const setCurrentView = (view, { persist = true } = {}) => {
  const previousView = currentView;
  currentView = VIEW_NAMES.has(view) ? view : 'tasks';
  if (persist) {
    localStorage.setItem(SAVED_VIEW_KEY, currentView);
  }
  if (currentUser && previousView !== currentView) {
    trackEvent('view_changed', { view: currentView, previous_view: previousView || null });
  }
};

const setActiveTaskSubtab = () => {
  taskSubtabs.forEach((tab) => {
    const isActive = tab.dataset.taskTab === currentView;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
};

const showSection = () => {
  if (!currentUser) {
    authSection.classList.remove('hidden');
    taskSection.classList.add('hidden');
    adminSection.classList.add('hidden');
    creditCardSection.classList.add('hidden');
    notesSection.classList.add('hidden');
    if (dashboardSection) dashboardSection.classList.add('hidden');
    floatingAddTask.classList.add('hidden');
    userArea.textContent = '';
    return;
  }

  if (currentView === 'admin' && !isAdminUser()) {
    setCurrentView('tasks');
  }

  authSection.classList.add('hidden');
  renderUserArea();

  const showDashboard = currentView === 'dashboard';
  const showAdmin = currentView === 'admin' && isAdminUser();
  const showCreditCards = currentView === 'credit-cards';
  const showNotes = currentView === 'notes';
  const showTaskWorkspace = isTaskWorkspaceView();
  taskSection.classList.toggle('hidden', showDashboard || showAdmin || showCreditCards || showNotes);
  adminSection.classList.toggle('hidden', !showAdmin);
  creditCardSection.classList.toggle('hidden', !showCreditCards);
  notesSection.classList.toggle('hidden', !showNotes);
  if (dashboardSection) dashboardSection.classList.toggle('hidden', !showDashboard);
  floatingAddTask.classList.toggle('hidden', showDashboard || showAdmin || showCreditCards || showNotes || currentView === 'weather' || currentView === 'tags');

  if (showDashboard) {
    if (window.dashboardModule) {
      window.dashboardModule.load({ silent: false });
      window.dashboardModule.attachRealtime?.();
    }
    return;
  }

  if (showAdmin) {
    loadUsers();
    return;
  }

  if (showCreditCards) {
    creditCardModule.load();
    creditCardModule.refreshActivePanel?.();
    return;
  }

  if (showNotes) {
    notesModule.load();
    return;
  }

  const showWeather = currentView === 'weather';
  const showTags = currentView === 'tags';
  const showCalendar = currentView === 'calendar';
  taskSubtabNav.classList.toggle('hidden', !showTaskWorkspace);
  setActiveTaskSubtab();
  weatherModule.hideQuoteWidget();
  taskHeader.classList.toggle('hidden', showWeather || showTags || showCalendar);
  tagManager.classList.toggle('hidden', !showTags);
  calendarSection.classList.toggle('hidden', !showCalendar);
  taskList.classList.toggle('hidden', showWeather || showTags || showCalendar);
  weatherSection.classList.toggle('hidden', !showWeather);

  if (showWeather) {
    weatherModule.render();
    return;
  }

  if (showTags) {
    weatherModule.hideQuoteWidget();
    taskForm.classList.add('hidden');
    loadTags();
    loadTasks();
    return;
  }

  if (showCalendar) {
    taskForm.classList.add('hidden');
    loadTasks();
    return;
  }

  taskForm.classList.toggle('hidden', currentView === 'archived');
  loadTags();
  loadTasks();
};

const showAddTaskModal = () => {
  taskPriorityInput.value = DEFAULT_TASK_PRIORITY;
  pendingAddTask = { related_task_ids: [], related_tasks: [] };
  if (addRelatedTasksSearch) addRelatedTasksSearch.value = '';
  hideRelatedTaskResults('add');
  renderRelatedTaskPicker('add');
  addTaskModal.classList.remove('hidden');
  document.getElementById('task-title').focus();
};

const openAddTaskFlow = () => {
  setCurrentView('tasks');
  showSection();
  showAddTaskModal();
};

const hideAddTaskModal = () => {
  pendingAddTask = { related_task_ids: [], related_tasks: [] };
  if (addRelatedTasksList) addRelatedTasksList.innerHTML = '';
  if (addRelatedTasksSearch) addRelatedTasksSearch.value = '';
  hideRelatedTaskResults('add');
  addTaskModal.classList.add('hidden');
};

const renderUserArea = () => {
  userArea.innerHTML = '';
  const welcome = document.createElement('span');
  welcome.textContent = isImpersonating()
    ? t('impersonatingAs', { username: currentUser.name || currentUser.username })
    : t('welcome', { name: currentUser.name || currentUser.username });
  userArea.append(welcome);
  logoutButton.className = 'secondary nav-button';
  setNavButtonContent(logoutButton, t('logout'), '⎋');

  const notesButton = document.createElement('button');
  notesButton.type = 'button';
  notesButton.className = `secondary nav-button ${currentView === 'notes' ? 'active-nav' : ''}`;
  setNavButtonContent(notesButton, t('notes'), '✎');
  notesButton.addEventListener('click', () => {
    setCurrentView('notes');
    showSection();
  });

  const tasksButton = document.createElement('button');
  tasksButton.type = 'button';
  tasksButton.className = `secondary nav-button ${isTaskWorkspaceView() ? 'active-nav' : ''}`;
  setNavButtonContent(tasksButton, t('tasks'), '☰');
  tasksButton.addEventListener('click', () => {
    if (!isTaskWorkspaceView()) {
      setCurrentView('tasks');
    }
    showSection();
  });

  const weatherButton = document.createElement('button');
  weatherButton.type = 'button';
  weatherButton.className = `secondary nav-button ${currentView === 'weather' ? 'active-nav' : ''}`;
  setNavButtonContent(weatherButton, t('weather'), '☀');
  weatherButton.addEventListener('click', () => {
    setCurrentView('weather');
    showSection();
  });

  const creditCardsButton = document.createElement('button');
  creditCardsButton.type = 'button';
  creditCardsButton.className = `secondary nav-button ${currentView === 'credit-cards' ? 'active-nav' : ''}`;
  setNavButtonContent(creditCardsButton, t('creditCards'), '$');
  creditCardsButton.addEventListener('click', () => {
    setCurrentView('credit-cards');
    showSection();
  });

  const dashboardButton = document.createElement('button');
  dashboardButton.type = 'button';
  dashboardButton.className = `secondary nav-button ${currentView === 'dashboard' ? 'active-nav' : ''}`;
  setNavButtonContent(dashboardButton, t('dashboardTab'), '◎');
  dashboardButton.addEventListener('click', () => {
    setCurrentView('dashboard');
    showSection();
  });

  userArea.append(dashboardButton, notesButton, tasksButton, weatherButton, creditCardsButton);

  if (isAdminUser()) {
    const adminButton = document.createElement('button');
    adminButton.type = 'button';
    adminButton.className = `secondary nav-button ${currentView === 'admin' ? 'active-nav' : ''}`;
    setNavButtonContent(adminButton, t('manageUsers'), '👤');
    adminButton.addEventListener('click', () => {
      setCurrentView('admin');
      showSection();
    });

    userArea.append(adminButton);
  }

  if (isImpersonating()) {
    const returnButton = document.createElement('button');
    returnButton.type = 'button';
    returnButton.className = 'secondary nav-button impersonation-return';
    setNavButtonContent(returnButton, t('backToAdmin'), 'A');
    returnButton.addEventListener('click', stopImpersonation);
    userArea.append(returnButton);
  }

  const settingsButton = document.createElement('button');
  settingsButton.type = 'button';
  settingsButton.className = 'secondary nav-button';
  setNavButtonContent(settingsButton, t('userSettings'), '⚙');
  settingsButton.addEventListener('click', showUserSettingsModal);
  userArea.append(settingsButton);

  userArea.append(logoutButton);
};

const setMode = (mode) => {
  currentMode = mode;
  showLogin.classList.toggle('active', mode === 'login');
  showSignup.classList.toggle('active', mode === 'signup');
  authEmailField?.classList.toggle('hidden', mode !== 'signup');
  if (authEmailInput) authEmailInput.required = mode === 'signup';
  passwordInput.setAttribute('autocomplete', mode === 'login' ? 'current-password' : 'new-password');
  if (mode === 'signup') {
    registrationStartedAt = Date.now();
    registrationInteractionCount = 0;
    authForm.username.value = '';
    if (authEmailInput) authEmailInput.value = '';
    authForm.password.value = '';
    if (authForm.website) authForm.website.value = '';
    if (rememberMeCheckbox) rememberMeCheckbox.checked = false;
    authMessage.textContent = '';
  }
};

const getBrowserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (_error) {
    return 'UTC';
  }
};

const getActiveTimezone = () => currentTimezone || currentUser?.timezone || getBrowserTimezone();

const populateTimezoneSuggestions = () => {
  if (!timezoneSuggestions) return;
  const fallbackTimezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Asia/Ho_Chi_Minh',
    'Asia/Bangkok',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];
  const timezones = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : fallbackTimezones;
  timezoneSuggestions.innerHTML = '';
  timezones.forEach((timezone) => {
    const option = document.createElement('option');
    option.value = timezone;
    timezoneSuggestions.append(option);
  });
};

const applyUserPreferences = (user) => {
  currentTimezone = user?.timezone || null;
  if (user?.language && translations[user.language]) {
    currentLanguage = user.language;
    localStorage.setItem('task-manager-language', user.language);
  }
};

const setSettingsError = (element, text) => {
  if (!element) return;
  element.textContent = text || '';
  element.classList.toggle('hidden', !text);
};

const showUserSettingsModal = () => {
  if (!currentUser || !userSettingsModal) return;
  setSettingsError(userSettingsFormError, '');
  setSettingsError(passwordSettingsFormError, '');
  userSettingsForm?.reset();
  passwordSettingsForm?.reset();
  settingsNameInput.value = currentUser.name || '';
  settingsEmailInput.value = currentUser.email || '';
  settingsTimezoneInput.value = getActiveTimezone();
  settingsLanguageInput.value = currentUser.language || currentLanguage;
  userSettingsModal.classList.remove('hidden');
  settingsNameInput.focus();
};

const hideUserSettingsModal = () => {
  userSettingsForm?.reset();
  passwordSettingsForm?.reset();
  setSettingsError(userSettingsFormError, '');
  setSettingsError(passwordSettingsFormError, '');
  userSettingsModal?.classList.add('hidden');
};

const handleUserSettingsSubmit = async (event) => {
  event.preventDefault();
  setSettingsError(userSettingsFormError, '');

  const result = await request('/api/me', {
    method: 'PUT',
    body: JSON.stringify({
      name: settingsNameInput.value.trim(),
      email: settingsEmailInput.value.trim(),
      timezone: settingsTimezoneInput.value.trim(),
      language: settingsLanguageInput.value,
    }),
  });

  if (result.error) {
    setSettingsError(userSettingsFormError, result.error);
    return;
  }

  currentUser = result.user;
  applyUserPreferences(currentUser);
  applyTranslations();
  identifyMonitoringUser();
  trackEvent('settings_saved', {
    has_timezone: Boolean(currentUser.timezone),
    language: currentUser.language || currentLanguage,
  });
  renderUserArea();
  dashboardModule.refresh?.();
  showStatusToast(t('settingsSaved'));
};

const updateRememberedPassword = (newPassword) => {
  if (!rememberMeCheckbox?.checked || !currentUser?.username) return;
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER_ME_KEY) || '{}') || {};
    if (saved.username === currentUser.username) {
      localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({ username: currentUser.username, password: newPassword }));
    }
  } catch (error) {
    console.warn('Failed to update remembered password', error);
  }
};

const submitPasswordSettings = async () => {
  if (isPasswordSettingsSaving) return;
  passwordSettingsFormError?.classList.remove('settings-success');
  setSettingsError(passwordSettingsFormError, '');

  const currentPassword = settingsCurrentPasswordInput.value;
  const newPassword = settingsNewPasswordInput.value;
  if (!currentPassword || !newPassword) {
    setSettingsError(passwordSettingsFormError, t('passwordRequired'));
    return;
  }

  isPasswordSettingsSaving = true;
  if (savePasswordSettings) savePasswordSettings.disabled = true;

  let result;
  try {
    result = await request('/api/me/password', {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  } catch (error) {
    result = { error: error.message || 'Failed to update password' };
  } finally {
    isPasswordSettingsSaving = false;
    if (savePasswordSettings) savePasswordSettings.disabled = false;
  }

  if (result.error) {
    passwordSettingsFormError?.classList.remove('settings-success');
    setSettingsError(passwordSettingsFormError, result.error);
    return;
  }

  updateRememberedPassword(newPassword);
  passwordSettingsForm.reset();
  trackEvent('password_changed');
  passwordSettingsFormError?.classList.add('settings-success');
  setSettingsError(passwordSettingsFormError, t('passwordUpdated'));
  showStatusToast(t('passwordUpdated'));
};

const handlePasswordSettingsSubmit = async (event) => {
  event.preventDefault();
  await submitPasswordSettings();
};

const togglePasswordVisibility = () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  togglePasswordButton.setAttribute('aria-pressed', String(isHidden));
  togglePasswordButton.setAttribute('aria-label', isHidden ? t('hidePassword') : t('showPassword'));
};

// request() is provided by js/apiClient.js (window.ApiClient)
const request = apiClient.request;

const prefillRememberedCredentials = () => {
  try {
    const saved = localStorage.getItem(REMEMBER_ME_KEY);
    if (!saved) return;
    const { username, password } = JSON.parse(saved) || {};
    if (typeof username === 'string') authForm.username.value = username;
    if (typeof password === 'string') authForm.password.value = password;
    if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
  } catch (error) {
    console.warn('Failed to load remembered credentials', error);
  }
};

const init = async () => {
  prefillRememberedCredentials();
  const result = await request('/api/me');
  currentUser = result.user;
  applyUserPreferences(currentUser);
  applyTranslations();
  identifyMonitoringUser();
  showSection();
  if (!currentUser && new URLSearchParams(window.location.search).get('verified') === '1') {
    authMessage.textContent = t('emailVerified');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  if (currentUser) connectRealtime();
};

// Real-time sync — keeps web and iOS WebView in lockstep.
// We refetch the affected list on each event rather than try to splice
// individual changes into local state — small payloads, simple and correct.
let realtimeSocket = null;
let pendingTaskRefresh = null;
let pendingNoteRefresh = null;

const scheduleTaskRefresh = () => {
  if (pendingTaskRefresh) return;
  pendingTaskRefresh = setTimeout(() => {
    pendingTaskRefresh = null;
    if (currentUser) {
      loadTasks();
      loadTags();
    }
  }, 150);
};

const scheduleNoteRefresh = () => {
  if (pendingNoteRefresh) return;
  pendingNoteRefresh = setTimeout(() => {
    pendingNoteRefresh = null;
    if (currentUser && currentView === 'notes') {
      notesModule.load();
    }
  }, 150);
};

const connectRealtime = () => {
  if (typeof window.io !== 'function') return;
  if (realtimeSocket && realtimeSocket.connected) return;

  realtimeSocket = window.io({
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  // Expose the socket so feature modules (dashboard) can attach their own
  // listeners without going through this file.
  window.realtimeSocket = realtimeSocket;

  ['task:created', 'task:updated', 'task:deleted'].forEach((event) => {
    realtimeSocket.on(event, scheduleTaskRefresh);
  });

  ['note:created', 'note:updated', 'note:deleted'].forEach((event) => {
    realtimeSocket.on(event, scheduleNoteRefresh);
  });

  ['transaction:created', 'transaction:updated', 'transaction:deleted'].forEach((event) => {
    realtimeSocket.on(event, () => {
      if (transactionsModule && typeof transactionsModule.load === 'function') {
        transactionsModule.load();
      }
    });
  });

  // Dashboard listens for tasks, notes, bills, and credit cards via its own
  // helper so the same socket drives every visible view.
  if (typeof dashboardModule !== 'undefined' && dashboardModule.attachRealtime) {
    dashboardModule.attachRealtime();
  }
};

const disconnectRealtime = () => {
  if (!realtimeSocket) return;
  if (typeof dashboardModule !== 'undefined' && dashboardModule.detachRealtime) {
    dashboardModule.detachRealtime();
  }
  realtimeSocket.removeAllListeners();
  realtimeSocket.disconnect();
  realtimeSocket = null;
  window.realtimeSocket = null;
};

const resetFinancialModules = () => {
  creditCardModule.reset?.();
  transactionsModule.reset?.();
  notesModule.reset?.();
};

const markRegistrationInteraction = () => {
  if (currentMode === 'signup') {
    registrationInteractionCount += 1;
  }
};

const handleAuthSubmit = async (event) => {
  event.preventDefault();
  authMessage.textContent = '';

  const username = authForm.username.value.trim();
  const password = authForm.password.value.trim();
  const email = authEmailInput?.value.trim() || '';

  if (!username || !password) {
    authMessage.textContent = t('authRequired');
    return;
  }
  if (currentMode === 'signup' && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    authMessage.textContent = t('emailRequired');
    return;
  }

  const endpoint = currentMode === 'login' ? '/api/login' : '/api/register';
  const payload = currentMode === 'login'
    ? { username, password }
    : {
      username,
      email,
      password,
      human_check: {
        started_at: registrationStartedAt,
        interaction_count: registrationInteractionCount,
        website: authForm.website?.value || '',
      },
    };
  const result = await request(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.error) {
    authMessage.textContent = result.error;
    return;
  }

  if (currentMode === 'signup') {
    trackEvent('signup_submitted');
    authMessage.textContent = result.message || t('verificationEmailSent');
    setMode('login');
    return;
  }

  if (rememberMeCheckbox?.checked) {
    try {
      localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({ username, password }));
    } catch (error) {
      console.warn('Failed to remember credentials', error);
    }
  } else {
    localStorage.removeItem(REMEMBER_ME_KEY);
  }

  resetFinancialModules();
  currentUser = result.user;
  applyUserPreferences(currentUser);
  applyTranslations();
  identifyMonitoringUser();
  trackEvent('login_succeeded');
  setCurrentView(getSavedView());
  authForm.reset();
  if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
  showSection();
  connectRealtime();
};

const loadTags = async () => {
  tagMessage.textContent = '';
  const result = await request('/api/tags');
  if (result.error) {
    tagMessage.textContent = result.error;
    return;
  }
  tags = result.tags || [];
  if (currentTagFilter && !tags.some((tag) => tag.name.toLowerCase() === currentTagFilter.toLowerCase())) {
    currentTagFilter = '';
  }
  renderTags(tags);
};

const hideTagSuggestions = (panel) => {
  panel.classList.add('hidden');
  panel.innerHTML = '';
};

const showTagSuggestions = (input, panel) => {
  const query = input.value.trim().toLowerCase();
  const matches = tags
    .filter((tag) => !query || tag.name.toLowerCase().includes(query))
    .slice(0, 6);

  panel.innerHTML = '';
  if (!matches.length) {
    hideTagSuggestions(panel);
    return;
  }

  matches.forEach((tag) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'tag-suggestion-option';
    option.setAttribute('role', 'option');
    option.textContent = tag.name;
    option.addEventListener('mousedown', (event) => event.preventDefault());
    option.addEventListener('click', () => {
      input.value = tag.name;
      hideTagSuggestions(panel);
      input.focus();
    });
    panel.append(option);
  });

  panel.classList.remove('hidden');
};

const setupTagSuggestions = (input, panel) => {
  input.addEventListener('input', () => showTagSuggestions(input, panel));
  input.addEventListener('focus', () => showTagSuggestions(input, panel));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hideTagSuggestions(panel);
    }
  });
  input.addEventListener('blur', () => {
    setTimeout(() => hideTagSuggestions(panel), 120);
  });
};

const renderTags = (tags) => {
  tagList.innerHTML = '';
  hideTagSuggestions(taskTagSuggestions);
  hideTagSuggestions(editTaskTagSuggestions);

  if (!tags.length) {
    const empty = document.createElement('p');
    empty.className = 'tag-empty';
    empty.textContent = t('noTags');
    tagList.append(empty);
    return;
  }

  tags.forEach((tag) => {
    const item = document.createElement('div');
    item.className = 'tag-manager-item';
    const tagTaskCount = tasks.filter((task) => (task.tag || '').toLowerCase() === tag.name.toLowerCase()).length;

    const name = document.createElement('button');
    name.type = 'button';
    name.className = `tag-manager-name ${currentTagFilter.toLowerCase() === tag.name.toLowerCase() ? 'active' : ''}`;
    const nameText = document.createElement('span');
    nameText.textContent = tag.name;
    name.append(nameText);
    if (tagTaskCount > 1) {
      const count = document.createElement('span');
      count.className = 'tag-manager-count';
      count.textContent = tagTaskCount;
      name.append(count);
    }
    name.addEventListener('click', () => {
      currentTagFilter = tag.name;
      setCurrentView('tasks');
      showSection();
    });

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary';
    editButton.textContent = t('edit');
    editButton.addEventListener('click', () => showEditTagModal(tag));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger';
    deleteButton.textContent = t('delete');
    deleteButton.addEventListener('click', () => showTagDeleteConfirm(tag));

    const actions = document.createElement('div');
    actions.className = 'tag-manager-actions';
    actions.append(editButton, deleteButton);
    item.append(name, actions);
    tagList.append(item);
  });
};

const handleTagSubmit = async (event) => {
  event.preventDefault();
  tagMessage.textContent = '';

  const tagNameInput = document.getElementById('tag-name');
  const name = tagNameInput.value.trim();
  if (!name) {
    tagMessage.textContent = t('tagRequired');
    return;
  }
  if (name.length > 40) {
    tagMessage.textContent = t('tagTooLong');
    return;
  }

  const result = await request('/api/tags', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  if (result.error) {
    tagMessage.textContent = result.error;
    return;
  }

  tagForm.reset();
  showStatusToast(t('tagAdded'));
  loadTags();
};

const clearEditTagError = () => {
  editTagError.textContent = '';
  editTagError.classList.add('hidden');
};

const showEditTagModal = (tag) => {
  pendingEditTag = tag;
  clearEditTagError();
  editTagNameInput.value = tag.name;
  editTagModal.classList.remove('hidden');
  editTagNameInput.focus();
  editTagNameInput.select();
};

const hideEditTagModal = () => {
  pendingEditTag = null;
  editTagForm.reset();
  clearEditTagError();
  editTagModal.classList.add('hidden');
};

const renameTag = async (tag, name) => {
  const normalizedName = name.trim();
  if (!normalizedName) {
    editTagError.textContent = t('tagRequired');
    editTagError.classList.remove('hidden');
    return;
  }
  if (normalizedName.length > 40) {
    editTagError.textContent = t('tagTooLong');
    editTagError.classList.remove('hidden');
    return;
  }

  const result = await request(`/api/tags/${tag.id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: normalizedName }),
  });

  if (result.error) {
    editTagError.textContent = result.error;
    editTagError.classList.remove('hidden');
    return;
  }

  if (currentTagFilter.toLowerCase() === tag.name.toLowerCase()) {
    currentTagFilter = normalizedName;
  }
  hideEditTagModal();
  showStatusToast(t('tagUpdated'));
  await loadTags();
  loadTasks();
};

const deleteTag = async (tag) => {
  const result = await request(`/api/tags/${tag.id}`, {
    method: 'DELETE',
  });

  if (result.error) {
    alert(result.error);
    return;
  }

  if (currentTagFilter.toLowerCase() === tag.name.toLowerCase()) {
    currentTagFilter = '';
  }
  showStatusToast(t('tagDeleted'));
  await loadTags();
  loadTasks();
};

const loadUsers = async () => {
  adminMessage.textContent = '';
  const result = await request('/api/admin/users');
  if (result.error) {
    adminMessage.textContent = result.error;
    return;
  }
  users = result.users || [];
  renderImpersonateOptions(users);
  renderUsers(users);
  auditLogPage = 1;
  await loadAuditLogs();
};

const renderAuditLogPagination = (pagination) => {
  if (!auditLogPagination || !auditLogPageInfo || !auditLogPrevious || !auditLogNext) return;
  if (!pagination || pagination.totalPages <= 1) {
    auditLogPagination.classList.add('hidden');
    return;
  }

  auditLogPagination.classList.remove('hidden');
  auditLogPageInfo.textContent = t('pageStatus', {
    page: pagination.page,
    totalPages: pagination.totalPages,
    total: pagination.total,
  });
  auditLogPrevious.disabled = !pagination.hasPreviousPage;
  auditLogNext.disabled = !pagination.hasNextPage;
};

const loadAuditLogs = async (page = auditLogPage) => {
  if (!isAdminUser()) return;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(AUDIT_LOG_PAGE_SIZE),
  });
  const search = auditLogSearchInput?.value.trim() || '';
  if (search) params.set('q', search);

  const result = await request(`/api/admin/audit-logs?${params.toString()}`);
  if (result.error) {
    adminMessage.textContent = result.error;
    return;
  }
  auditLogs = result.logs || [];
  auditLogPage = result.pagination?.page || 1;
  renderAuditLogs(auditLogs);
  renderAuditLogPagination(result.pagination);
};

const scheduleAuditLogSearch = () => {
  if (auditLogSearchTimer) clearTimeout(auditLogSearchTimer);
  auditLogSearchTimer = setTimeout(() => {
    auditLogPage = 1;
    loadAuditLogs(1);
  }, 250);
};

const renderImpersonateOptions = (users) => {
  if (!impersonateUserSelect) return;
  impersonateUserSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = t('impersonate');
  impersonateUserSelect.append(placeholder);

  users
    .filter((user) => user.username !== 'admin')
    .forEach((user) => {
      const option = document.createElement('option');
      option.value = String(user.id);
      option.textContent = user.name ? `${user.username} (${user.name})` : user.username;
      option.disabled = user.account_status !== 'enabled';
      impersonateUserSelect.append(option);
    });

  impersonateUserSelect.value = '';
  impersonateUserSelect.disabled = impersonateUserSelect.options.length <= 1;
};

const renderUsers = (users) => {
  userList.innerHTML = '';

  users.forEach((user) => {
    const row = document.createElement('tr');

    const usernameCell = document.createElement('td');
    usernameCell.dataset.label = t('username');
    usernameCell.textContent = user.username;

    const nameCell = document.createElement('td');
    nameCell.dataset.label = t('name');
    nameCell.textContent = user.name || '';

    const emailCell = document.createElement('td');
    emailCell.dataset.label = t('email');
    emailCell.textContent = user.email || '';

    const statusCell = document.createElement('td');
    statusCell.dataset.label = t('userStatus');
    const statusBadge = document.createElement('span');
    const isDisabled = user.account_status === 'disabled';
    const isPending = user.account_status === 'pending_verification';
    statusBadge.className = `user-status-badge ${isDisabled || isPending ? 'disabled' : 'enabled'}`;
    statusBadge.textContent = isPending
      ? t('userPendingStatus')
      : (isDisabled ? t('userDisabledStatus') : t('userEnabledStatus'));
    statusCell.append(statusBadge);

    const taskCountCell = document.createElement('td');
    taskCountCell.dataset.label = t('tasks');
    const taskBadge = document.createElement('span');
    taskBadge.className = 'user-task-badge';
    taskBadge.textContent = user.task_count;
    taskCountCell.append(taskBadge);

    const noteCountCell = document.createElement('td');
    noteCountCell.dataset.label = t('notes');
    const noteBadge = document.createElement('span');
    noteBadge.className = 'user-task-badge';
    noteBadge.textContent = user.note_count;
    noteCountCell.append(noteBadge);

    const actionsCell = document.createElement('td');
    actionsCell.dataset.label = t('actions');
    const actions = document.createElement('div');
    actions.className = 'user-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'task-action-icon';
    editButton.textContent = '✎';
    editButton.setAttribute('aria-label', t('edit'));
    editButton.title = t('edit');
    editButton.addEventListener('click', () => showAdminUserModal(user));

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'task-action-icon';
    resetButton.textContent = '🔑';
    resetButton.setAttribute('aria-label', t('resetPassword'));
    resetButton.title = t('resetPassword');
    resetButton.addEventListener('click', () => resetUserPassword(user));

    actions.append(editButton, resetButton);

    if (user.username !== 'admin' && user.id !== currentUser.id) {
      const statusButton = document.createElement('button');
      statusButton.type = 'button';
      statusButton.className = `task-action-icon ${isDisabled ? '' : 'secondary'}`;
      statusButton.textContent = isDisabled ? '+' : '-';
      statusButton.setAttribute('aria-label', isDisabled ? t('enableUser') : t('disableUser'));
      statusButton.title = isDisabled ? t('enableUser') : t('disableUser');
      statusButton.addEventListener('click', () => toggleUserStatus(user));
      actions.append(statusButton);
    }

    if (user.username !== 'admin' && user.id !== currentUser.id) {
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'task-action-icon danger';
      deleteButton.textContent = '×';
      deleteButton.setAttribute('aria-label', t('delete'));
      deleteButton.title = t('delete');
      deleteButton.addEventListener('click', () => showUserDeleteConfirm(user));
      actions.append(deleteButton);
    }

    actionsCell.append(actions);
    row.append(usernameCell, nameCell, emailCell, statusCell, taskCountCell, noteCountCell, actionsCell);
    userList.append(row);
  });
};

const formatAuditAction = (action) => {
  if (action === 'create') return t('created');
  if (action === 'edit') return t('updated');
  if (action === 'delete') return t('delete');
  if (action === 'login') return t('login');
  if (action === 'register') return t('signup');
  return action;
};

const formatAuditTarget = (log) => {
  const labels = {
    credit_card: t('creditCards'),
    expense: t('monthlyBills'),
    note: t('notes'),
    task: t('tasks'),
    transaction: t('transactionsSubTab'),
    user: t('manageUsers'),
  };
  const type = labels[log.entity_type] || log.entity_type;
  return `${type} #${log.entity_id || ''}`.trim();
};

const formatAuditDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${month}/${day}/${year} ${time}`;
};

const renderAuditLogs = (logs) => {
  if (!auditLogList) return;
  auditLogList.innerHTML = '';

  if (!logs.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'empty-table-cell';
    cell.textContent = t('auditNoEvents');
    row.append(cell);
    auditLogList.append(row);
    return;
  }

  logs.forEach((log) => {
    const row = document.createElement('tr');
    const actor = log.impersonator_username
      ? `${log.actor_username || ''} -> ${log.username || ''}`
      : (log.actor_username || log.username || '');
    const cells = [
      [t('time'), formatAuditDateTime(log.created_at)],
      [t('actor'), actor],
      [t('actions'), formatAuditAction(log.action)],
      [t('target'), formatAuditTarget(log)],
      [t('owner'), log.username || ''],
      [t('summary'), log.summary || ''],
    ];

    cells.forEach(([label, value]) => {
      const cell = document.createElement('td');
      cell.dataset.label = label;
      if (label === t('summary') && value) {
        cell.className = 'audit-log-summary-cell';
        cell.title = value;
      }
      cell.textContent = value;
      row.append(cell);
    });

    auditLogList.append(row);
  });
};

const clearAdminUserFormError = () => {
  adminUserFormError.textContent = '';
  adminUserFormError.classList.add('hidden');
};

const showAdminUserModal = (user = null) => {
  pendingAdminUser = user;
  clearAdminUserFormError();
  adminUserForm.reset();

  adminUserModalTitle.textContent = user ? t('editUser') : t('addUser');
  saveAdminUser.setAttribute('aria-label', user ? t('save') : t('addUser'));
  saveAdminUser.title = user ? t('save') : t('addUser');
  adminPasswordField.classList.toggle('hidden', Boolean(user));
  adminPasswordInput.required = !user;
  adminStatusInput.disabled = user?.username === 'admin';

  if (user) {
    adminNameInput.value = user.name || '';
    adminUsernameInput.value = user.username || '';
    adminEmailInput.value = user.email || '';
    adminStatusInput.value = user.account_status || 'enabled';
  } else {
    adminStatusInput.value = 'enabled';
  }

  adminUserModal.classList.remove('hidden');
  adminUsernameInput.focus();
  adminUsernameInput.select();
};

const hideAdminUserModal = () => {
  pendingAdminUser = null;
  adminUserForm.reset();
  adminPasswordField.classList.remove('hidden');
  adminPasswordInput.required = true;
  adminStatusInput.disabled = false;
  clearAdminUserFormError();
  adminUserModal.classList.add('hidden');
};

const handleAdminUserSubmit = async (event) => {
  event.preventDefault();
  adminMessage.textContent = '';
  clearAdminUserFormError();

  const username = adminUsernameInput.value.trim();
  const name = adminNameInput.value.trim();
  const email = adminEmailInput.value.trim();
  const accountStatus = adminStatusInput.value;
  const password = adminPasswordInput.value.trim();
  const isEditing = Boolean(pendingAdminUser);

  if (!username || (!isEditing && !password)) {
    adminUserFormError.textContent = t('authRequired');
    adminUserFormError.classList.remove('hidden');
    return;
  }

  if (/\s/.test(username)) {
    adminUserFormError.textContent = t('usernameNoSpaces');
    adminUserFormError.classList.remove('hidden');
    return;
  }

  const result = await request(isEditing ? `/api/admin/users/${pendingAdminUser.id}` : '/api/admin/users', {
    method: isEditing ? 'PUT' : 'POST',
    body: JSON.stringify(isEditing
      ? { username, name, email, account_status: accountStatus }
      : { username, name, email, password, account_status: accountStatus }),
  });

  if (result.error) {
    adminUserFormError.textContent = result.error;
    adminUserFormError.classList.remove('hidden');
    return;
  }

  hideAdminUserModal();
  showStatusToast(isEditing ? t('userUpdated') : t('userAdded'));
  loadUsers();
};

const clearResetPasswordError = () => {
  resetPasswordError.textContent = '';
  resetPasswordError.classList.add('hidden');
};

const showResetPasswordModal = (user) => {
  pendingResetPasswordUser = user;
  clearResetPasswordError();
  resetPasswordForm.reset();
  setText('#reset-password-title', t('newPasswordFor', { username: user.username }));
  resetPasswordModal.classList.remove('hidden');
  resetPasswordInput.focus();
};

const hideResetPasswordModal = () => {
  pendingResetPasswordUser = null;
  resetPasswordForm.reset();
  clearResetPasswordError();
  resetPasswordModal.classList.add('hidden');
};

const resetUserPassword = (user) => {
  showResetPasswordModal(user);
};

const submitResetPassword = async (user, password) => {
  if (!password.trim()) {
    resetPasswordError.textContent = t('passwordRequired');
    resetPasswordError.classList.remove('hidden');
    return;
  }

  const result = await request(`/api/admin/users/${user.id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });

  if (result.error) {
    resetPasswordError.textContent = result.error;
    resetPasswordError.classList.remove('hidden');
    return;
  }

  hideResetPasswordModal();
  showStatusToast(t('passwordUpdated'));
};

const startImpersonation = async (userId) => {
  const result = await request('/api/admin/impersonate', {
    method: 'POST',
    body: JSON.stringify({ user_id: Number(userId) }),
  });

  if (result.error) {
    adminMessage.textContent = result.error;
    if (impersonateUserSelect) impersonateUserSelect.value = '';
    return;
  }

  resetFinancialModules();
  currentUser = result.user;
  applyUserPreferences(currentUser);
  applyTranslations();
  identifyMonitoringUser();
  trackEvent('impersonation_started');
  disconnectRealtime();
  connectRealtime();
  setCurrentView('dashboard');
  showStatusToast(t('impersonationStarted', { username: currentUser.username }));
  showSection();
};

const stopImpersonation = async () => {
  const result = await request('/api/impersonation/stop', { method: 'POST' });

  if (result.error) {
    alert(result.error);
    return;
  }

  resetFinancialModules();
  currentUser = result.user;
  applyUserPreferences(currentUser);
  applyTranslations();
  identifyMonitoringUser();
  trackEvent('impersonation_stopped');
  disconnectRealtime();
  connectRealtime();
  setCurrentView('admin');
  showStatusToast(t('impersonationStopped'));
  showSection();
};

const toggleUserStatus = async (user) => {
  const nextStatus = user.account_status === 'disabled' ? 'enabled' : 'disabled';
  const result = await request(`/api/admin/users/${user.id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ account_status: nextStatus }),
  });

  if (result.error) {
    alert(result.error);
    return;
  }

  showStatusToast(nextStatus === 'disabled' ? t('userDisabled') : t('userEnabled'));
  loadUsers();
};

const deleteUser = async (user) => {
  const result = await request(`/api/admin/users/${user.id}`, {
    method: 'DELETE',
  });

  if (result.error) {
    alert(result.error);
    return;
  }

  loadUsers();
};

const handleTaskSubmit = async (event) => {
  event.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const priority = taskPriorityInput.value;
  const status = taskStatusInput.value;
  const tag = taskTagInput.value.trim();
  const descriptionEditor = document.getElementById('task-description');
  const description = getRichEditorValue(descriptionEditor);
  const due_date = taskDueDateInput.value || null;
  const reminder_at = taskReminderInput?.value || null;
  const attachmentFile = taskAttachmentInput.files[0] || null;

  // Recurrence data
  const is_recurring = taskRecurringCheckbox.checked;
  const recurrence_pattern = is_recurring ? taskRecurrencePattern.value : null;
  const recurrence_interval = is_recurring && recurrence_pattern === 'daily' ?
    parseInt(taskRecurrenceInterval.value) : null;
  const recurrence_days = is_recurring && recurrence_pattern === 'weekly' ?
    getSelectedWeekdays() : null;

  const titleError = document.getElementById('title-error');
  const descriptionError = document.getElementById('description-error');
  const attachmentError = document.getElementById('attachment-error');
  const formError = document.getElementById('form-error');

  // Clear previous errors
  titleError.classList.add('hidden');
  descriptionError.classList.add('hidden');
  attachmentError.classList.add('hidden');
  formError.classList.add('hidden');

  // Validation
  if (!title) {
    formError.textContent = t('titleRequired');
    formError.classList.remove('hidden');
    return;
  }

  if (title.length > 20) {
    titleError.textContent = t('titleTooLong');
    titleError.classList.remove('hidden');
    return;
  }

  if (getRichEditorLength(descriptionEditor) > MAX_TASK_TEXT_LENGTH) {
    descriptionError.textContent = t('descriptionTooLong');
    descriptionError.classList.remove('hidden');
    return;
  }

  if (attachmentFile && attachmentFile.size > MAX_ATTACHMENT_BYTES) {
    attachmentError.textContent = t('attachmentTooLarge');
    attachmentError.classList.remove('hidden');
    return;
  }

  if (attachmentFile && !preparedAttachment) {
    attachmentError.textContent = t('attachmentNotReady');
    attachmentError.classList.remove('hidden');
    return;
  }

  // Validate weekly recurrence has at least one day selected
  if (is_recurring && recurrence_pattern === 'weekly' && (!recurrence_days || recurrence_days === '')) {
    formError.textContent = t('weeklyRecurrenceNeedsDays') || 'Please select at least one day for weekly recurrence';
    formError.classList.remove('hidden');
    return;
  }

  try {
    const result = await request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title, tag, description, priority, status, due_date, reminder_at, attachment: preparedAttachment, language: currentLanguage,
        related_task_ids: getRelatedTaskIds(pendingAddTask),
        is_recurring, recurrence_pattern, recurrence_interval, recurrence_days
      }),
    });

    if (result.error) {
      formError.textContent = result.error;
      formError.classList.remove('hidden');
      return;
    }

    if (result.task) {
      authForm.reset();
      taskForm.reset();
      taskPriorityInput.value = DEFAULT_TASK_PRIORITY;
      taskStatusInput.value = 'todo';
      descriptionEditor.innerHTML = '';
      preparedAttachment = null;
      pendingAddTask = { related_task_ids: [], related_tasks: [] };
      if (addRelatedTasksSearch) addRelatedTasksSearch.value = '';
      renderRelatedTaskPicker('add');
      taskRecurringCheckbox.checked = false;
      recurrenceOptions.classList.add('hidden');
      titleError.classList.add('hidden');
      descriptionError.classList.add('hidden');
      attachmentError.classList.add('hidden');
      formError.classList.add('hidden');
      hideAddTaskModal();
      trackEvent('task_created', {
        priority,
        status,
        has_tag: Boolean(tag),
        has_due_date: Boolean(due_date),
        has_reminder: Boolean(reminder_at),
        has_attachment: Boolean(preparedAttachment),
        is_recurring: Boolean(is_recurring),
      });
      loadTags();
      loadTasks();
    }
  } catch (error) {
    captureMonitoringError(error, { feature: 'tasks', action: 'create' });
    formError.textContent = error.message;
    formError.classList.remove('hidden');
  }
};

const loadTasks = async () => {
  const showingArchived = currentView === 'archived';
  const result = await request(`/api/tasks${showingArchived ? '?archived=true' : ''}`);
  if (result.tasks) {
    tasks = result.tasks;
    if (!showingArchived) {
      renderTags(tags);
    }
    renderTasks(result.tasks);
    if (currentView === 'calendar') {
      calendarModule.render();
    }
    if (!showingArchived) {
      scheduleTaskReminders(result.tasks);
    }
  }
};

const renderTasks = (tasks) => {
  taskList.innerHTML = '';
  const showingArchived = currentView === 'archived';
  const activeTagFilter = !showingArchived && currentTagFilter;
  const searchQuery = taskSearchInput.value.trim().toLowerCase();
  const filteredByTag = activeTagFilter
    ? tasks.filter((task) => (task.tag || '').toLowerCase() === currentTagFilter.toLowerCase())
    : tasks;
  const visibleTasks = filteredByTag.filter((task) => taskMatchesSearch(task, searchQuery));

  if (activeTagFilter) {
    const filterBar = document.createElement('div');
    filterBar.className = 'task-filter-bar';
    const filterText = document.createElement('span');
    filterText.textContent = t('tasksForTag', { tag: currentTagFilter });
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'secondary';
    clearButton.textContent = t('clearTagFilter');
    clearButton.addEventListener('click', () => {
      currentTagFilter = '';
      renderTags(tags);
      renderTasks(tasks);
    });
    filterBar.append(filterText, clearButton);
    taskList.append(filterBar);
  }

  if (visibleTasks.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = searchQuery
      ? t('noSearchTasks')
      : activeTagFilter
      ? t('noTaggedTasks')
      : showingArchived
        ? t('noArchivedTasks')
        : t('noTasks');
    taskList.append(empty);
    return;
  }

  if (showingArchived) {
    const column = document.createElement('section');
    column.className = 'task-column task-column-wide';
    const header = document.createElement('div');
    header.className = 'task-column-header';
    const heading = document.createElement('h3');
    heading.textContent = t('archived');
    const count = document.createElement('span');
    count.className = 'task-count';
    count.textContent = visibleTasks.length;
    header.append(heading, count);
    const body = document.createElement('div');
    body.className = 'task-column-body';
    visibleTasks.forEach((task) => body.append(createTaskCard(task)));
    column.append(header, body);
    taskList.append(column);
    return;
  }

  const todoTasks = sortTasksByPriority(visibleTasks.filter((task) => taskStatus(task) === 'todo'));
  const inProgressTasks = sortTasksByPriority(visibleTasks.filter((task) => taskStatus(task) === 'in_progress'));
  const doneTasks = sortTasksByPriority(visibleTasks.filter((task) => taskStatus(task) === 'done'));

  const createColumn = (title, status, columnTasks) => {
    const column = document.createElement('section');
    column.className = `task-column task-column-${status}`;
    column.dataset.status = status;

    const heading = document.createElement('h3');
    heading.textContent = title;

    const count = document.createElement('span');
    count.className = 'task-count';
    count.textContent = columnTasks.length;

    const header = document.createElement('div');
    header.className = 'task-column-header';
    header.append(heading, count);

    const body = document.createElement('div');
    body.className = 'task-column-body';
    body.dataset.status = status;
    body.addEventListener('dragover', handleTaskDragOver);
    body.addEventListener('dragenter', handleTaskDragEnter);
    body.addEventListener('dragleave', handleTaskDragLeave);
    body.addEventListener('drop', handleTaskDrop);

    if (columnTasks.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'task-empty';
      empty.textContent = t('noRecords');
      body.append(empty);
    } else {
      columnTasks.forEach((task) => body.append(createTaskCard(task)));
    }

    column.append(header, body);
    return column;
  };

  taskList.append(
    createColumn(t('todo'), 'todo', todoTasks),
    createColumn(t('in_progress'), 'in_progress', inProgressTasks),
    createColumn(t('done'), 'done', doneTasks)
  );
};

const createTaskCard = (task) => {
    const currentStatus = taskStatus(task);
    const isArchived = Boolean(task.archived);
    const isHighPriority = task.priority === 'high';
    const card = document.createElement('div');
    card.className = [
      'task-item',
      isHighPriority ? 'priority-high-task' : '',
      isTaskOverdue(task) ? 'overdue-task' : '',
      currentStatus === 'done' ? 'completed' : '',
      isArchived ? 'archived' : '',
    ].filter(Boolean).join(' ');
    card.draggable = !isArchived;
    card.dataset.taskId = task.id;
    card.dataset.status = currentStatus;
    card.tabIndex = 0;
    card.addEventListener('click', (event) => {
      if (window.matchMedia('(max-width: 640px)').matches && !event.target.closest('button, a')) {
        showPreviewTaskModal(task);
      }
    });
    if (!isArchived) {
      card.addEventListener('dragstart', handleTaskDragStart);
      card.addEventListener('dragend', handleTaskDragEnd);
    }

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    const title = document.createElement('strong');
    title.textContent = task.title;
    if (task.is_recurring) {
      const recurringBadge = document.createElement('span');
      recurringBadge.className = 'recurring-badge';
      recurringBadge.textContent = '🔄';
      recurringBadge.title = 'Recurring task';
      title.append(' ', recurringBadge);
    }
    const badges = document.createElement('div');
    badges.className = 'task-badges';
    const priority = document.createElement('span');
    priority.className = `priority-badge priority-${task.priority || 'medium'}`;
    priority.textContent = priorityLabel(task.priority);
    badges.append(priority);
    if (task.tag) {
      const tag = document.createElement('span');
      tag.className = 'tag-badge';
      tag.textContent = task.tag;
      badges.append(tag);
    }
    meta.append(title, badges);

    const description = document.createElement('div');
    description.className = 'task-description';
    if (task.description) {
      description.innerHTML = renderStoredRichText(task.description);
      openRichTextLinksWithModifier(description);
    } else {
      description.textContent = t('noDescription');
    }

    const comment = document.createElement('div');
    comment.className = 'task-comment';
    comment.innerHTML = `<strong>${escapeHtml(t('comment'))}:</strong> ${renderStoredRichText(task.comment)}`;
    openRichTextLinksWithModifier(comment);

    const reminder = document.createElement('p');
    reminder.className = 'task-reminder';
    reminder.textContent = `${t('alert')}: ${formatLocalDateTime(task.reminder_at)}`;

    const dueDate = document.createElement('p');
    dueDate.className = 'task-due-date';
    dueDate.textContent = `${t('dueDate')}: ${getTaskDueDateKey(task)}`;

    const attachment = document.createElement('a');
    if (task.attachment_data && task.attachment_name) {
      attachment.className = 'task-attachment';
      attachment.href = task.attachment_data;
      attachment.download = task.attachment_name;
      attachment.textContent = `${t('attachment')}: ${task.attachment_name}`;
      attachAttachmentPreviewHandler(attachment, task);
    }

    const actions = document.createElement('div');
    actions.className = 'task-actions';
    actions.addEventListener('mouseenter', () => card.classList.add('suppress-task-hover'));
    actions.addEventListener('mouseleave', () => card.classList.remove('suppress-task-hover'));
    actions.addEventListener('focusin', () => card.classList.add('suppress-task-hover'));
    actions.addEventListener('focusout', () => card.classList.remove('suppress-task-hover'));

    const hoverMessage = document.createElement('div');
    hoverMessage.className = 'task-hover-popover';
    hoverMessage.setAttribute('role', 'status');

    hoverMessage.textContent = getRichTextPlainText(task.description) || t('noDescription');

    const toggleButton = document.createElement('button');
    setActionIconButton(toggleButton, currentStatus === 'done' ? t('markOpen') : t('markDone'), currentStatus === 'done' ? '↻' : '✓');
    toggleButton.addEventListener('click', () => updateTask(task.id, { status: currentStatus === 'done' ? 'todo' : 'done' }));

    const archiveButton = document.createElement('button');
    setActionIconButton(archiveButton, isArchived ? t('restore') : t('archive'), isArchived ? '↥' : '▣');
    archiveButton.addEventListener('click', () => updateTask(task.id, { archived: !isArchived }));

    const previewButton = document.createElement('button');
    setActionIconButton(previewButton, t('preview'), '👁');
    previewButton.addEventListener('click', () => showPreviewTaskModal(task));

    const editButton = document.createElement('button');
    setActionIconButton(editButton, t('edit'), '✎');
    editButton.addEventListener('click', () => showEditTaskModal(task));

    const deleteButton = document.createElement('button');
    setActionIconButton(deleteButton, t('delete'), '×');
    deleteButton.classList.add('danger');
    deleteButton.addEventListener('click', () => showDeleteConfirm(task.id));

    if (!isArchived) {
      actions.append(toggleButton);
    }
    if ((task.description && getRichTextPlainText(task.description).length > 180) || task.comment) {
      actions.append(previewButton);
    }
    actions.append(editButton, archiveButton, deleteButton);
    card.append(hoverMessage, meta, description);
    if (task.comment) {
      card.append(comment);
    }
    if (task.due_date) {
      card.append(dueDate);
    }
    if (task.reminder_at) {
      card.append(reminder);
    }
    if (attachment.href) {
      card.append(attachment);
    }
    card.append(actions);
    return card;
};

const handleTaskDragStart = (event) => {
  const card = event.currentTarget;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', card.dataset.taskId);
  event.dataTransfer.setData('application/x-task-status', card.dataset.status);
  card.classList.add('dragging');
};

const handleTaskDragEnd = (event) => {
  event.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.task-column-body.drag-over').forEach((column) => {
    column.classList.remove('drag-over');
  });
};

const handleTaskDragOver = (event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
};

const handleTaskDragEnter = (event) => {
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
};

const handleTaskDragLeave = (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    event.currentTarget.classList.remove('drag-over');
  }
};

const handleTaskDrop = async (event) => {
  event.preventDefault();
  const column = event.currentTarget;
  column.classList.remove('drag-over');

  const taskId = event.dataTransfer.getData('text/plain');
  const nextStatus = column.dataset.status;
  const task = tasks.find((item) => String(item.id) === taskId);

  if (!task || taskStatus(task) === nextStatus) {
    return;
  }

  await updateTask(task.id, { status: nextStatus });
};

const updateTask = async (id, updates) => {
  const result = await request(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (result.error) {
    showStatusToast(result.error, 'error');
    return result;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'tag')) {
    await loadTags();
  }
  await loadTasks();
  return result;
};

const savePastedAttachmentToOpenTask = async (event) => {
  if (!pendingPreviewTask || previewTaskModal.classList.contains('hidden')) return;

  const file = fileFromClipboard(event.clipboardData);
  if (!file) return;
  event.preventDefault();

  if (file.size > MAX_ATTACHMENT_BYTES) {
    showStatusToast(t('attachmentTooLarge'), 'error');
    return;
  }

  try {
    showUploadProgress();
    const attachment = await readAttachmentFile(file, setUploadProgress);
    setUploadProgress(95);
    const result = await updateTask(pendingPreviewTask.id, { attachment });
    if (result?.task) {
      pendingPreviewTask = result.task;
      showStatusToast(t('taskSaved'));
    }
    setUploadProgress(100);
  } catch (error) {
    showStatusToast(error.message, 'error');
  } finally {
    setTimeout(hideUploadProgress, 250);
  }
};

const deleteTask = async (id) => {
  await request(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
  loadTasks();
};

const showDeleteConfirm = (id) => {
  pendingDeleteTaskId = id;
  pendingDeleteUser = null;
  pendingDeleteTag = null;
  pendingDeleteCard = null;
  pendingDeleteFastAccessLink = null;
  pendingDeleteNote = null;
  pendingDeleteTransaction = null;
  deleteConfirmTitle.textContent = t('deleteTaskTitle');
  deleteConfirmMessage.textContent = t('deleteTaskMessage');
  deleteConfirmModal.classList.remove('hidden');
  confirmDeleteNo.focus();
};

const showUserDeleteConfirm = (user) => {
  pendingDeleteTaskId = null;
  pendingDeleteUser = user;
  pendingDeleteTag = null;
  pendingDeleteCard = null;
  pendingDeleteFastAccessLink = null;
  pendingDeleteNote = null;
  pendingDeleteTransaction = null;
  deleteConfirmTitle.textContent = t('deleteUserTitle');
  deleteConfirmMessage.textContent = t('deleteUserMessage', { username: user.username });
  deleteConfirmModal.classList.remove('hidden');
  confirmDeleteNo.focus();
};

const showTagDeleteConfirm = (tag) => {
  pendingDeleteTaskId = null;
  pendingDeleteUser = null;
  pendingDeleteTag = tag;
  pendingDeleteCard = null;
  pendingDeleteFastAccessLink = null;
  pendingDeleteNote = null;
  pendingDeleteTransaction = null;
  deleteConfirmTitle.textContent = t('deleteTagTitle');
  deleteConfirmMessage.textContent = t('deleteTagMessage', { tag: tag.name });
  deleteConfirmModal.classList.remove('hidden');
  confirmDeleteNo.focus();
};

const showCreditCardDeleteConfirm = (card) => {
  pendingDeleteTaskId = null;
  pendingDeleteUser = null;
  pendingDeleteTag = null;
  pendingDeleteCard = card;
  pendingDeleteFastAccessLink = null;
  pendingDeleteNote = null;
  pendingDeleteTransaction = null;
  deleteConfirmTitle.textContent = t('deleteCreditCardTitle');
  deleteConfirmMessage.textContent = t('deleteCreditCardMessage', { name: card.name });
  deleteConfirmModal.classList.remove('hidden');
  confirmDeleteNo.focus();
};

const showFastAccessLinkDeleteConfirm = (link) => {
  pendingDeleteTaskId = null;
  pendingDeleteUser = null;
  pendingDeleteTag = null;
  pendingDeleteCard = null;
  pendingDeleteFastAccessLink = link;
  pendingDeleteNote = null;
  pendingDeleteTransaction = null;
  deleteConfirmTitle.textContent = t('deleteFastAccessLinkTitle');
  deleteConfirmMessage.textContent = t('deleteFastAccessLinkMessage', { label: link.label || t('fastAccessLinks') });
  deleteConfirmModal.classList.remove('hidden');
  confirmDeleteNo.focus();
};

const showNoteDeleteConfirm = (note) => {
  pendingDeleteTaskId = null;
  pendingDeleteUser = null;
  pendingDeleteTag = null;
  pendingDeleteCard = null;
  pendingDeleteFastAccessLink = null;
  pendingDeleteNote = note;
  pendingDeleteTransaction = null;
  deleteConfirmTitle.textContent = t('deleteNoteTitle');
  deleteConfirmMessage.textContent = t('deleteNoteMessage');
  deleteConfirmModal.classList.remove('hidden');
  confirmDeleteNo.focus();
};

const showTransactionDeleteConfirm = (transaction) => {
  pendingDeleteTaskId = null;
  pendingDeleteUser = null;
  pendingDeleteTag = null;
  pendingDeleteCard = null;
  pendingDeleteFastAccessLink = null;
  pendingDeleteNote = null;
  pendingDeleteTransaction = transaction;
  deleteConfirmTitle.textContent = t('confirmDeleteTransaction');
  deleteConfirmMessage.textContent = t('confirmDeleteTransaction');
  deleteConfirmModal.classList.remove('hidden');
  confirmDeleteNo.focus();
};

const hideDeleteConfirm = () => {
  pendingDeleteTaskId = null;
  pendingDeleteUser = null;
  pendingDeleteTag = null;
  pendingDeleteCard = null;
  pendingDeleteFastAccessLink = null;
  pendingDeleteNote = null;
  pendingDeleteTransaction = null;
  deleteConfirmModal.classList.add('hidden');
};

confirmDeleteNo.addEventListener('click', hideDeleteConfirm);

confirmDeleteYes.addEventListener('click', async () => {
  if (!pendingDeleteTaskId && !pendingDeleteUser && !pendingDeleteTag && !pendingDeleteCard && !pendingDeleteFastAccessLink && !pendingDeleteNote && !pendingDeleteTransaction) return;
  const taskId = pendingDeleteTaskId;
  const user = pendingDeleteUser;
  const tag = pendingDeleteTag;
  const card = pendingDeleteCard;
  const fastAccessLink = pendingDeleteFastAccessLink;
  const note = pendingDeleteNote;
  const transaction = pendingDeleteTransaction;
  hideDeleteConfirm();
  if (taskId) {
    await deleteTask(taskId);
    return;
  }
  if (tag) {
    await deleteTag(tag);
    return;
  }
  if (card) {
    await creditCardModule.deleteCard(card);
    return;
  }
  if (fastAccessLink) {
    await creditCardModule.deleteFastAccessLink(fastAccessLink);
    return;
  }
  if (note) {
    await notesModule.deleteNote(note);
    return;
  }
  if (transaction) {
    await transactionsModule.deleteTransaction(transaction);
    return;
  }
  await deleteUser(user);
});

deleteConfirmModal.addEventListener('click', (event) => {
  if (event.target === deleteConfirmModal) {
    hideDeleteConfirm();
  }
});

editTagForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!pendingEditTag) return;
  clearEditTagError();
  await renameTag(pendingEditTag, editTagNameInput.value);
});

cancelEditTag.addEventListener('click', hideEditTagModal);

resetPasswordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!pendingResetPasswordUser) return;
  clearResetPasswordError();
  await submitResetPassword(pendingResetPasswordUser, resetPasswordInput.value);
});

cancelResetPassword.addEventListener('click', hideResetPasswordModal);

cancelAddTask.addEventListener('click', hideAddTaskModal);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !deleteConfirmModal.classList.contains('hidden')) {
    hideDeleteConfirm();
  }

  if (event.key === 'Escape' && !editTagModal.classList.contains('hidden')) {
    hideEditTagModal();
  }

  if (event.key === 'Escape' && !resetPasswordModal.classList.contains('hidden')) {
    hideResetPasswordModal();
  }

  if (event.key === 'Escape' && !addTaskModal.classList.contains('hidden')) {
    hideAddTaskModal();
  }

  if (event.key === 'Escape' && !adminUserModal.classList.contains('hidden')) {
    hideAdminUserModal();
  }

  if (event.key === 'Escape' && !userSettingsModal.classList.contains('hidden')) {
    hideUserSettingsModal();
  }

  if (event.key === 'Escape' && !editTaskModal.classList.contains('hidden')) {
    hideEditTaskModal();
  }

  if (event.key === 'Escape' && !previewTaskModal.classList.contains('hidden')) {
    hidePreviewTaskModal();
  }

  if (event.key === 'Escape' && !attachmentPreviewModal.classList.contains('hidden')) {
    hideAttachmentPreview();
  }

  if (event.key === 'Escape' && !reminderAlertModal.classList.contains('hidden')) {
    hideReminderAlert();
  }

  if (event.key === 'Escape' && !statusToast.classList.contains('hidden')) {
    hideStatusToast();
  }
});

document.addEventListener('paste', savePastedAttachmentToOpenTask);

const clearEditTaskErrors = () => {
  editTitleError.classList.add('hidden');
  editDescriptionError.classList.add('hidden');
  editAttachmentError.classList.add('hidden');
  editFormError.classList.add('hidden');
};

const renderEditAttachmentState = () => {
  if (!editCurrentAttachment) return;

  editCurrentAttachment.innerHTML = '';

  const task = pendingEditTask;
  const hasExistingAttachment = Boolean(task?.attachment_data && task?.attachment_name);
  const hasNewAttachment = Boolean(preparedEditAttachment);
  if (!hasExistingAttachment && !hasNewAttachment && !removeEditAttachment) {
    editCurrentAttachment.classList.add('hidden');
    return;
  }

  editCurrentAttachment.classList.remove('hidden');

  const label = document.createElement('span');
  label.className = 'edit-current-attachment-label';
  label.textContent = hasNewAttachment ? t('newAttachment') : t('currentAttachment');

  const showsExistingAttachment = hasExistingAttachment && !removeEditAttachment;
  const fileName = document.createElement(showsExistingAttachment ? 'a' : 'span');
  fileName.className = showsExistingAttachment ? 'task-attachment' : 'edit-current-attachment-name';

  if (hasNewAttachment) {
    fileName.textContent = preparedEditAttachment.name;
  } else if (showsExistingAttachment) {
    fileName.href = task.attachment_data;
    fileName.download = task.attachment_name;
    fileName.textContent = task.attachment_name;
    attachAttachmentPreviewHandler(fileName, task);
  } else {
    fileName.textContent = t('noAttachment');
  }

  editCurrentAttachment.append(label, fileName);

  if ((hasExistingAttachment && !removeEditAttachment) || hasNewAttachment) {
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'secondary edit-remove-attachment';
    removeButton.textContent = t('removeAttachment');
    removeButton.addEventListener('click', () => {
      removeEditAttachment = true;
      preparedEditAttachment = null;
      editTaskAttachmentInput.value = '';
      renderEditAttachmentState();
    });
    editCurrentAttachment.append(removeButton);
  }
};

const showEditTaskModal = (task) => {
  pendingEditTask = task;
  preparedEditAttachment = null;
  removeEditAttachment = false;
  clearEditTaskErrors();
  editTaskTitleInput.value = task.title;
  editTaskPriorityInput.value = task.priority || 'medium';
  editTaskStatusInput.value = taskStatus(task);
  editTaskTagInput.value = task.tag || '';
  setRichEditorValue(editTaskDescriptionInput, task.description || '');
  setRichEditorValue(editTaskCommentInput, task.comment || '');
  editTaskDueDateInput.value = String(task.due_date || '').slice(0, 10);
  if (editTaskReminderInput) editTaskReminderInput.value = formatDateTimeLocalValue(task.reminder_at);
  editTaskRecurringCheckbox.checked = Boolean(task.is_recurring);
  editTaskRecurrencePattern.value = task.recurrence_pattern || 'daily';
  editTaskRecurrenceInterval.value = task.recurrence_interval || 1;
  setSelectedWeekdays(editWeeklyOptions, task.recurrence_days);
  syncRecurrenceOptions({
    checkbox: editTaskRecurringCheckbox,
    options: editRecurrenceOptions,
    pattern: editTaskRecurrencePattern,
    daily: editDailyOptions,
    weekly: editWeeklyOptions,
  });
  editTaskAttachmentInput.value = '';
  renderEditAttachmentState();
  if (editRelatedTasksSearch) editRelatedTasksSearch.value = '';
  hideRelatedTaskResults('edit');
  renderRelatedTaskPicker('edit');

  editTaskModal.classList.remove('hidden');
  editTaskTitleInput.focus();
  editTaskTitleInput.select();
};

const hideEditTaskModal = () => {
  pendingEditTask = null;
  preparedEditAttachment = null;
  removeEditAttachment = false;
  editTaskForm.reset();
  editTaskDescriptionInput.innerHTML = '';
  editTaskCommentInput.innerHTML = '';
  editRecurrenceOptions.classList.add('hidden');
  editDailyOptions.classList.remove('hidden');
  editWeeklyOptions.classList.add('hidden');
  setSelectedWeekdays(editWeeklyOptions);
  editCurrentAttachment.innerHTML = '';
  editCurrentAttachment.classList.add('hidden');
  if (editRelatedTasksList) editRelatedTasksList.innerHTML = '';
  if (editRelatedTasksSearch) editRelatedTasksSearch.value = '';
  hideRelatedTaskResults('edit');
  clearEditTaskErrors();
  editTaskModal.classList.add('hidden');
};

const handleEditTaskSubmit = async (event) => {
  event.preventDefault();
  if (!pendingEditTask) return;

  clearEditTaskErrors();

  const title = editTaskTitleInput.value.trim();
  const priority = editTaskPriorityInput.value;
  const status = editTaskStatusInput.value;
  const tag = editTaskTagInput.value.trim();
  const description = getRichEditorValue(editTaskDescriptionInput);
  const comment = getRichEditorValue(editTaskCommentInput);
  const dueDate = editTaskDueDateInput.value || null;
  const reminderAt = editTaskReminderInput?.value || null;
  const attachmentFile = editTaskAttachmentInput.files[0] || null;
  const isRecurring = editTaskRecurringCheckbox.checked;
  const recurrencePattern = isRecurring ? editTaskRecurrencePattern.value : null;
  const recurrenceInterval = isRecurring && recurrencePattern === 'daily'
    ? parseInt(editTaskRecurrenceInterval.value, 10)
    : null;
  const recurrenceDays = isRecurring && recurrencePattern === 'weekly'
    ? getSelectedWeekdays(editWeeklyOptions)
    : null;

  if (!title.trim()) {
    editFormError.textContent = t('titleEmpty');
    editFormError.classList.remove('hidden');
    return;
  }
  
  if (title.length > 20) {
    editTitleError.textContent = t('titleTooLong');
    editTitleError.classList.remove('hidden');
    return;
  }
  
  if (getRichEditorLength(editTaskDescriptionInput) > MAX_TASK_TEXT_LENGTH) {
    editDescriptionError.textContent = t('descriptionTooLong');
    editDescriptionError.classList.remove('hidden');
    return;
  }

  if (getRichTextPlainText(comment).length > MAX_TASK_TEXT_LENGTH) {
    editFormError.textContent = t('commentTooLong');
    editFormError.classList.remove('hidden');
    return;
  }

  if (attachmentFile && attachmentFile.size > MAX_ATTACHMENT_BYTES) {
    editAttachmentError.textContent = t('attachmentTooLarge');
    editAttachmentError.classList.remove('hidden');
    return;
  }

  if (attachmentFile && !preparedEditAttachment) {
    editAttachmentError.textContent = t('attachmentNotReady');
    editAttachmentError.classList.remove('hidden');
    return;
  }

  if (isRecurring && recurrencePattern === 'weekly' && !recurrenceDays) {
    editFormError.textContent = t('weeklyRecurrenceNeedsDays') || 'Please select at least one day for weekly recurrence';
    editFormError.classList.remove('hidden');
    return;
  }

  const task = pendingEditTask;
  const updates = {
    title,
    tag,
    priority,
    status,
    description,
    comment,
    due_date: dueDate,
    reminder_at: reminderAt,
    is_recurring: isRecurring,
    recurrence_pattern: recurrencePattern,
    recurrence_interval: recurrenceInterval,
    recurrence_days: recurrenceDays,
    related_task_ids: getRelatedTaskIds(pendingEditTask),
  };

  if (preparedEditAttachment) {
    updates.attachment = preparedEditAttachment;
  } else if (removeEditAttachment) {
    updates.attachment = null;
  }

  hideEditTaskModal();
  const result = await updateTask(task.id, updates);
  if (!result?.error) {
    showStatusToast(t('taskSaved'));
  }
};

cancelEditTask.addEventListener('click', hideEditTaskModal);

previewTaskDescription.addEventListener('change', (event) => {
  if (!event.target.matches('input[data-rich-checklist]')) return;
  syncChecklistItem(event.target);
  savePreviewChecklistField('description', previewTaskDescription);
});

previewTaskCommentDisplay.addEventListener('change', (event) => {
  if (!event.target.matches('input[data-rich-checklist]')) return;
  syncChecklistItem(event.target);
  savePreviewChecklistField('comment', previewTaskCommentDisplay);
});

const showPreviewTaskModal = (task) => {
  pendingPreviewTask = task;
  updatePreviewTaskModalTitle();
  renderRelatedTaskPicker('preview');
  previewTaskDescription.innerHTML = task.description
    ? renderStoredRichText(task.description)
    : t('noDescription');
  openRichTextLinksWithModifier(previewTaskDescription);
  setRichEditorValue(previewTaskCommentInput, task.comment || '');
  previewTaskCommentInput.contentEditable = 'false';
  previewTaskCommentDisplay.innerHTML = task.comment
    ? renderStoredRichText(task.comment)
    : t('noComment');
  previewTaskCommentDisplay.classList.remove('hidden');
  previewTaskCommentInput.closest('.rich-editor')?.classList.add('hidden');
  openRichTextLinksWithModifier(previewTaskCommentDisplay);
  renderTaskActivity();
  previewTaskModal.classList.remove('hidden');
};

const hidePreviewTaskModal = () => {
  pendingPreviewTask = null;
  previewTaskModal.classList.add('hidden');
  updatePreviewTaskModalTitle();
  previewTaskDescription.textContent = '';
  if (previewRelatedTasksList) previewRelatedTasksList.innerHTML = '';
  if (previewRelatedTasksSearch) previewRelatedTasksSearch.value = '';
  hideRelatedTaskResults('preview');
  previewTaskCommentDisplay.textContent = '';
  previewTaskCommentDisplay.classList.add('hidden');
  previewTaskCommentInput.closest('.rich-editor')?.classList.remove('hidden');
  previewTaskCommentInput.innerHTML = '';
  previewTaskCommentInput.contentEditable = 'true';
  activeActivityFilter = 'all';
  if (taskActivityList) taskActivityList.innerHTML = '';
};

const showAttachmentPreview = (task) => {
  if (!task?.attachment_data) return;

  attachmentPreviewTitle.textContent = task.attachment_name || t('attachment');
  const isImage = isImageAttachment(task);
  attachmentPreviewImage.classList.toggle('hidden', !isImage);
  attachmentPreviewFrame.classList.toggle('hidden', isImage);
  attachmentPreviewImage.src = isImage ? task.attachment_data : '';
  attachmentPreviewImage.alt = task.attachment_name || t('attachment');
  attachmentPreviewFrame.src = isImage ? '' : task.attachment_data;
  openAttachmentPreview.href = task.attachment_data;
  openAttachmentPreview.download = task.attachment_name || '';
  attachmentPreviewModal.classList.remove('hidden');
};

const hideAttachmentPreview = () => {
  attachmentPreviewModal.classList.add('hidden');
  attachmentPreviewImage.removeAttribute('src');
  attachmentPreviewImage.classList.add('hidden');
  attachmentPreviewFrame.removeAttribute('src');
  attachmentPreviewFrame.classList.remove('hidden');
  openAttachmentPreview.removeAttribute('download');
  openAttachmentPreview.href = '#';
};

editPreviewTask.addEventListener('click', () => {
  if (!pendingPreviewTask) return;
  const task = pendingPreviewTask;
  hidePreviewTaskModal();
  showEditTaskModal(task);
});

deletePreviewTask.addEventListener('click', () => {
  if (!pendingPreviewTask) return;
  const task = pendingPreviewTask;
  hidePreviewTaskModal();
  showDeleteConfirm(task.id);
});

sendPreviewTaskEmail.addEventListener('click', async () => {
  if (!pendingPreviewTask) return;
  sendPreviewTaskEmail.disabled = true;
  setActionIconButton(sendPreviewTaskEmail, t('sending'), '…');

  try {
    const result = await request(`/api/tasks/${pendingPreviewTask.id}/send-email`, {
      method: 'POST',
      body: JSON.stringify({ language: currentLanguage }),
    });

    if (result.error) {
      showStatusToast(result.error, 'error');
      return;
    }

    showStatusToast(t('emailSent'));
  } finally {
    sendPreviewTaskEmail.disabled = false;
    setActionIconButton(sendPreviewTaskEmail, t('sendEmail'), '✉');
  }
});

closePreviewTask.addEventListener('click', hidePreviewTaskModal);

relatedTasksModule.bind();

taskActivityTabs.forEach((button) => {
  button.addEventListener('click', () => {
    activeActivityFilter = button.dataset.activityFilter || 'all';
    renderTaskActivity();
  });
});

document.querySelectorAll('[data-related-trigger]').forEach((button) => {
  button.addEventListener('click', () => {
    const pickerName = button.dataset.relatedTrigger || 'edit';
    const search = pickerName === 'add' ? addRelatedTasksSearch : editRelatedTasksSearch;
    if (!search) return;
    const field = search.closest('.related-tasks-field');
    field?.classList.remove('hidden');
    field?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    search.focus();
    showRelatedTaskResults(pickerName);
  });
});

previewTaskModal.addEventListener('click', (event) => {
  if (event.target === previewTaskModal) {
    hidePreviewTaskModal();
  }
});

closeAttachmentPreview.addEventListener('click', hideAttachmentPreview);

attachmentPreviewModal.addEventListener('click', (event) => {
  if (event.target === attachmentPreviewModal) {
    hideAttachmentPreview();
  }
});

reminderAlertOk.addEventListener('click', hideReminderAlert);

reminderAlertModal.addEventListener('click', (event) => {
  if (event.target === reminderAlertModal) {
    hideReminderAlert();
  }
});

// Toast + upload-progress UI provided by js/ui/toast.js (window.ToastModule)
const {
  hideStatusToast,
  showStatusToast,
  setUploadProgress,
  registerServiceWorker,
  showUploadProgress,
  hideUploadProgress,
} = toast;

const handleLogout = async () => {
  await request('/api/logout', { method: 'POST' });
  resetFinancialModules();
  currentUser = null;
  currentTimezone = null;
  identifyMonitoringUser();
  trackEvent('logout');
  disconnectRealtime();
  setCurrentView('tasks', { persist: false });
  showSection();
  prefillRememberedCredentials();
};

const sendSummaryEmail = async () => {
  sendSummaryEmailButton.disabled = true;
  showStatusToast(t('sending'), 'success', { persist: true });

  try {
    const result = await request('/api/tasks/send-email', {
      method: 'POST',
      body: JSON.stringify({ language: currentLanguage }),
    });

    if (result.error) {
      showStatusToast(result.error, 'error');
      return;
    }

    showStatusToast(t('emailSent'));
  } catch (error) {
    showStatusToast(error.message || t('emailFailed'), 'error');
  } finally {
    sendSummaryEmailButton.disabled = false;
  }
};

const weatherModule = window.WeatherModule.create({
  request,
  t,
  showStatusToast,
  getCurrentUser: () => currentUser,
  getLanguage: () => currentLanguage,
  escapeHtml,
});

const creditCardModule = window.CreditCardModule.create({
  request,
  t,
  showStatusToast,
  getLanguage: () => currentLanguage,
  confirmDelete: showCreditCardDeleteConfirm,
  confirmDeleteFastAccessLink: showFastAccessLinkDeleteConfirm,
});

const transactionsModule = window.TransactionsModule.create({
  request,
  t,
  showStatusToast,
  getLanguage: () => currentLanguage,
  confirmDelete: showTransactionDeleteConfirm,
});

const notesModule = window.NotesModule.create({
  request,
  t,
  showStatusToast,
  confirmDelete: showNoteDeleteConfirm,
});

const dashboardModule = window.DashboardModule.create({
  request,
  t,
  getLanguage: () => currentLanguage,
  getTimezone: getActiveTimezone,
  showStatusToast,
  openAddTask: () => {
    setCurrentView('tasks');
    showSection();
    showAddTaskModal();
  },
  openNewNote: () => {
    setCurrentView('notes');
    showSection();
    if (typeof notesModule.addNote === 'function') notesModule.addNote();
  },
  navigateTo: ({ view }) => {
    if (!view) return;
    setCurrentView(view);
    showSection();
  },
});
window.dashboardModule = dashboardModule;

const exportsModule = window.ExportsModule.create({
  getTasks: () => tasks,
  t,
  priorityLabel,
  statusLabel,
  taskStatus,
  getRichTextPlainText,
  formatLocalDateTime,
  formatDateEST,
  showStatusToast,
});

showLogin.addEventListener('click', () => setMode('login'));
showSignup.addEventListener('click', () => setMode('signup'));
themeToggle.addEventListener('click', toggleTheme);
togglePasswordButton.addEventListener('click', togglePasswordVisibility);
const taskSubtabAddButton = document.getElementById('task-subtab-add-button');
floatingAddTask.addEventListener('click', openAddTaskFlow);
if (taskSubtabAddButton) {
  taskSubtabAddButton.addEventListener('click', openAddTaskFlow);
}
taskSearchInput.addEventListener('input', () => {
  updateTaskSearchState();
  renderTasks(tasks);
});
clearTaskSearch.addEventListener('click', () => {
  taskSearchInput.value = '';
  updateTaskSearchState();
  renderTasks(tasks);
  taskSearchInput.focus();
});
taskAttachmentInput.addEventListener('change', handleTaskAttachmentChange);
editTaskAttachmentInput.addEventListener('change', handleEditTaskAttachmentChange);
closePickerAfterTodaySelection(taskReminderInput);
closePickerAfterTodaySelection(editTaskReminderInput);
setupTagSuggestions(taskTagInput, taskTagSuggestions);
setupTagSuggestions(editTaskTagInput, editTaskTagSuggestions);

// Recurring task UI toggles
taskRecurringCheckbox.addEventListener('change', () => {
  syncRecurrenceOptions({
    checkbox: taskRecurringCheckbox,
    options: recurrenceOptions,
    pattern: taskRecurrencePattern,
    daily: dailyOptions,
    weekly: weeklyOptions,
  });
});

taskRecurrencePattern.addEventListener('change', () => {
  syncRecurrenceOptions({
    checkbox: taskRecurringCheckbox,
    options: recurrenceOptions,
    pattern: taskRecurrencePattern,
    daily: dailyOptions,
    weekly: weeklyOptions,
  });
});

editTaskRecurringCheckbox.addEventListener('change', () => {
  syncRecurrenceOptions({
    checkbox: editTaskRecurringCheckbox,
    options: editRecurrenceOptions,
    pattern: editTaskRecurrencePattern,
    daily: editDailyOptions,
    weekly: editWeeklyOptions,
  });
});

editTaskRecurrencePattern.addEventListener('change', () => {
  syncRecurrenceOptions({
    checkbox: editTaskRecurringCheckbox,
    options: editRecurrenceOptions,
    pattern: editTaskRecurrencePattern,
    daily: editDailyOptions,
    weekly: editWeeklyOptions,
  });
});

authForm.addEventListener('submit', handleAuthSubmit);
authForm.username.addEventListener('input', markRegistrationInteraction);
authForm.username.addEventListener('focus', markRegistrationInteraction);
authEmailInput?.addEventListener('input', markRegistrationInteraction);
authEmailInput?.addEventListener('focus', markRegistrationInteraction);
authForm.password.addEventListener('input', markRegistrationInteraction);
authForm.password.addEventListener('focus', markRegistrationInteraction);
taskForm.addEventListener('submit', handleTaskSubmit);
tagForm.addEventListener('submit', handleTagSubmit);
taskSubtabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    setCurrentView(tab.dataset.taskTab);
    showSection();
  });
});
creditCardModule.bind();
transactionsModule.bind();
window.transactionsModule = transactionsModule;
notesModule.bind();
dashboardModule.bind();
calendarModule.bind();
weatherModule.bind();
editTaskForm.addEventListener('submit', handleEditTaskSubmit);
adminUserForm.addEventListener('submit', handleAdminUserSubmit);
openAddUserModalButton.addEventListener('click', () => showAdminUserModal());
if (impersonateUserSelect) {
  impersonateUserSelect.addEventListener('change', (event) => {
    if (event.target.value) startImpersonation(event.target.value);
  });
}
refreshAuditLog?.addEventListener('click', () => loadAuditLogs(auditLogPage));
auditLogSearchInput?.addEventListener('input', scheduleAuditLogSearch);
auditLogPrevious?.addEventListener('click', () => loadAuditLogs(auditLogPage - 1));
auditLogNext?.addEventListener('click', () => loadAuditLogs(auditLogPage + 1));
cancelAdminUser.addEventListener('click', hideAdminUserModal);
userSettingsForm?.addEventListener('submit', handleUserSettingsSubmit);
passwordSettingsForm?.addEventListener('submit', handlePasswordSettingsSubmit);
savePasswordSettings?.addEventListener('click', async (event) => {
  event.preventDefault();
  await submitPasswordSettings();
});
cancelUserSettings?.addEventListener('click', hideUserSettingsModal);
logoutButton.addEventListener('click', handleLogout);
sendSummaryEmailButton.addEventListener('click', sendSummaryEmail);
exportExcelButton.addEventListener('click', exportsModule.exportToExcel);
exportPdfButton.addEventListener('click', exportsModule.exportToPdf);
if (exportWordButton) exportWordButton.addEventListener('click', exportsModule.exportToWord);

setMode('login');
setupRichTextEditors();
populateTimezoneSuggestions();
applyTranslations();
registerServiceWorker();
init();
