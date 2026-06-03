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
const languageSelect = document.getElementById('language-select');
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
const quoteWidget = document.getElementById('quote-widget');
const weatherSection = document.getElementById('weather-section');
const weatherForm = document.getElementById('weather-form');
const weatherCityInput = document.getElementById('weather-city-input');
const weatherList = document.getElementById('weather-list');
const weatherMessage = document.getElementById('weather-message');
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
const tagList = document.getElementById('tag-list');
const userList = document.getElementById('user-list');
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
const taskReminderInput = document.getElementById('task-reminder');
const taskRecurringCheckbox = document.getElementById('task-recurring');
const recurrenceOptions = document.getElementById('recurrence-options');
const taskRecurrencePattern = document.getElementById('task-recurrence-pattern');
const taskRecurrenceInterval = document.getElementById('task-recurrence-interval');
const dailyOptions = document.getElementById('daily-options');
const weeklyOptions = document.getElementById('weekly-options');
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
const editTaskReminderInput = document.getElementById('edit-task-reminder-input');
const editTaskAttachmentInput = document.getElementById('edit-task-attachment-input');
const editCurrentAttachment = document.getElementById('edit-current-attachment');
const editTitleError = document.getElementById('edit-title-error');
const editDescriptionError = document.getElementById('edit-description-error');
const editAttachmentError = document.getElementById('edit-attachment-error');
const editFormError = document.getElementById('edit-form-error');
const cancelEditTask = document.getElementById('cancel-edit-task');
const previewTaskModal = document.getElementById('preview-task-modal');
const previewTaskTitle = document.getElementById('preview-task-title');
const previewTaskDescription = document.getElementById('preview-task-description');
const previewTaskCommentDisplay = document.getElementById('preview-task-comment-display');
const previewTaskCommentInput = document.getElementById('preview-task-comment-input');
const editPreviewTask = document.getElementById('edit-preview-task');
const sendPreviewTaskEmail = document.getElementById('send-preview-task-email');
const savePreviewComment = document.getElementById('save-preview-comment');
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
const VIEW_NAMES = new Set(['dashboard', 'notes', 'tasks', 'archived', 'tags', 'weather', 'credit-cards', 'admin']);
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
let pendingAdminUser = null;
const reminderTimers = new Map();
let pendingDeleteTaskId = null;
let pendingDeleteUser = null;
let pendingDeleteTag = null;
let pendingDeleteCard = null;
let pendingDeleteFastAccessLink = null;
let pendingDeleteNote = null;
let pendingEditTag = null;
let pendingEditTask = null;
let pendingPreviewTask = null;
let statusToastTimer = null;
let reminderAlertPreviousFocus = null;
let preparedAttachment = null;
let preparedEditAttachment = null;
let removeEditAttachment = false;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_TASK_TEXT_LENGTH = 10000;
const DEFAULT_TASK_PRIORITY = 'low';
const DAILY_QUOTE_API_URL = '/api/daily-quote';
const DAILY_QUOTE_CACHE_KEY = 'task-manager-daily-quote';
const WEATHER_CACHE_PREFIX = 'task-manager-weather-cities';
const DEFAULT_DAILY_QUOTE = {
  text: 'Loading today\'s quote...',
  author: '',
};

const translations = {
  en: {
    appTitle: 'Task Manager',
    appSubtitle: 'Plan, tag, and track your work',
    language: 'Language',
    darkMode: 'Dark',
    lightMode: 'Light',
    switchToDarkMode: 'Switch to dark mode',
    switchToLightMode: 'Switch to light mode',
    rememberMe: 'Remember me',
    login: 'Login',
    signup: 'Sign Up',
    username: 'Username',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Submit',
    yourTasks: 'Your Tasks',
    sendEmail: 'Send Email',
    exportExcel: 'Export to Excel',
    exportPdf: 'Export to PDF',
    exportWord: 'Export to Word',
    logout: 'Logout',
    userSettings: 'User Settings',
    profileSettings: 'Profile',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    timezone: 'Timezone',
    settingsSaved: 'Settings saved.',
    passwordUpdated: 'Password updated.',
    passwordRequired: 'Current password and new password are required',
    searchTasks: 'Search tasks',
    searchTasksPlaceholder: 'Search title, description, comment',
    clearSearch: 'Clear search',
    noSearchTasks: 'No tasks match your search.',
    title: 'Title',
    max20: '(max 20 characters)',
    priority: 'Priority',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    status: 'Status',
    tag: 'Tag',
    tagPlaceholder: 'Work, personal, urgent...',
    manageTags: 'Manage Tags',
    tagName: 'Tag name',
    addTag: 'Add Tag',
    noTags: 'No tags yet.',
    tasksForTag: 'Tasks tagged "{tag}"',
    clearTagFilter: 'Clear filter',
    noTaggedTasks: 'No tasks match this tag.',
    tagRequired: 'Tag name is required',
    tagTooLong: 'Tag name must be 40 characters or less',
    tagAdded: 'Tag added.',
    tagUpdated: 'Tag updated.',
    tagDeleted: 'Tag deleted.',
    renameTag: 'Rename tag',
    todo: 'Todo',
    in_progress: 'In Progress',
    done: 'Done',
    description: 'Description',
    descriptionPlaceholder: 'Write notes, lists, and details here...',
    addComment: 'Add comment',
    comment: 'Comment',
    commentPlaceholder: 'Add a comment about this task...',
    max500: '(max 10000 characters)',
    dateTimeAlert: 'Date Time Alert',
    uploadFile: 'Upload File',
    addTask: 'Add Task',
    manageUsers: 'User',
    addUser: 'Add User',
    editUser: 'Edit User',
    impersonate: 'Impersonate...',
    impersonateUser: 'Impersonate user',
    backToAdmin: 'Back to Admin',
    impersonatingAs: 'Acting as {username}',
    impersonationStarted: 'Now viewing as {username}.',
    impersonationStopped: 'Back to admin.',
    userUpdated: 'User updated.',
    id: 'ID',
    tasks: 'Tasks',
    notes: 'Notes',
    newNote: 'New note',
    deleteNote: 'Delete note',
    pinNote: 'Pin note',
    unpinNote: 'Unpin note',
    deleteNoteTitle: 'Delete note?',
    deleteNoteMessage: 'This note will be permanently removed.',
    noteSaved: 'Saved',
    noteSaving: 'Saving...',
    notePaste: 'Paste',
    notePasteFailed: 'Could not read clipboard',
    linkedTask: 'Linked task',
    noLinkedTask: 'No linked task',
    noteHistory: 'History',
    noteHistoryEmpty: 'No previous versions yet.',
    previousPage: 'Previous',
    nextPage: 'Next',
    pageStatus: 'Page {page} of {totalPages} ({total} total)',
    restoreVersion: 'Restore',
    notesEmpty: 'No notes yet. Tap + to start.',
    notePlaceholderTitle: 'Title',
    notePlaceholderBody: 'Start writing...',
    untitledNote: 'New note',
    searchNotes: 'Search notes',
    archive: 'Archive',
    archived: 'Archived',
    restore: 'Restore',
    addTaskShortcut: 'Add task',
    noArchivedTasks: 'No archived tasks.',
    weather: 'Weather',
    creditCards: 'Financial',
    creditCardAccounts: 'Financial',
    creditCardSubTab: 'Credit card',
    creditCardInfoSubTab: 'Expense',
    transactionsSubTab: 'Transactions',
    addTransaction: 'Add Transaction',
    editTransaction: 'Edit Transaction',
    importStatement: 'Import statement PDF',
    importPreviewTitle: 'Import statement',
    importParsing: 'Reading your statement…',
    importNoItems: 'No purchases were found in this statement.',
    importConfirm: 'Import selected',
    importSuccess: 'Imported {count} transactions',
    importNotConfigured: 'AI import is not configured.',
    importFailed: 'Failed to import statement.',
    transactionAdded: 'Transaction added',
    transactionUpdated: 'Transaction updated',
    transactionDeleted: 'Transaction deleted',
    failedToLoadTransactions: 'Failed to load transactions',
    failedToSaveTransaction: 'Failed to save transaction',
    failedToDeleteTransaction: 'Failed to delete transaction',
    confirmDeleteTransaction: 'Delete this transaction?',
    income: 'Income',
    expense: 'Expense',
    fastAccessLinks: 'Bill Payment Websites',
    addFastAccessLink: 'Add Bill Payment Website',
    noFastAccessLinks: 'No bill payment websites yet.',
    fastAccessLinkDeleted: 'Bill payment website deleted',
    fastAccessLinkAdded: 'Bill payment website added',
    monthlyBills: 'Bill',
    otherSubTab: 'Other',
    editBill: 'Edit bill',
    billItem: 'Item',
    billItemRequired: 'Item is required',
    amount: 'Amount',
    invalidBillAmount: 'Amount must be a valid amount',
    noBillsToExport: 'No expense rows to export',
    dueDate: 'Due Date',
    payBefore: 'Pay Before',
    grandTotalIncludingRent: 'Grand total',
    mortgageLink: 'Mortgage',
    electricLink: 'Electric',
    waterLink: 'Water',
    gasLink: 'Gas',
    internetLink: 'Internet',
    phoneLink: 'Phone',
    cardName: 'Card No',
    cardNamePlaceholder: 'Card number or nickname',
    creditCardUser: 'User',
    creditCardUserPlaceholder: 'Card holder',
    creditCardIssuer: 'Type',
    creditCardIssuerPlaceholder: 'Select type',
    totalBalance: 'Balance',
    interestCharge: 'Interest Charged',
    invalidCreditCardIssuer: 'Card type must be one of the available options',
    closingDate: 'Close',
    addCard: 'Add Card',
    addCreditCard: 'Add card',
    noCreditCards: 'No credit cards yet.',
    noCreditCardsToExport: 'No credit cards to export',
    creditCardAdded: 'Credit card added.',
    creditCardUpdated: 'Credit card updated.',
    creditCardDeleted: 'Credit card deleted.',
    deleteCreditCardTitle: 'Delete card?',
    deleteCreditCardMessage: 'Card {name} will be permanently removed.',
    deleteFastAccessLinkTitle: 'Delete bill payment website?',
    deleteFastAccessLinkMessage: '{label} will be permanently removed.',
    editCreditCard: 'Edit card',
    closingDateSaved: 'Close saved.',
    creditCardNameRequired: 'Card No is required',
    invalidCreditCardBalance: 'Balance must be a valid amount',
    invalidClosingDate: 'Close must be a valid date',
    addCity: 'Add City',
    cityPlaceholder: 'Search city',
    cityNotFound: 'City was not found.',
    citySaved: 'City weather added.',
    noSavedWeatherCities: 'No saved weather cities yet.',
    loadingWeather: 'Loading weather...',
    weatherUnable: 'Unable to load weather.',
    humidity: 'Humidity',
    localTime: 'Local Time',
    wind: 'Wind',
    actions: 'Actions',
    welcome: 'Welcome, {name}',
    authRequired: 'Username and password are required.',
    emailRequired: 'A valid email is required.',
    verificationEmailSent: 'Registration received. Please verify your email before logging in.',
    emailVerified: 'Email verified. You can log in now.',
    resetPassword: 'Reset Password',
    delete: 'Delete',
    newPasswordFor: 'New password for {username}',
    passwordRequired: 'Password is required',
    passwordUpdated: 'Password updated.',
    titleRequired: 'Title is required',
    titleTooLong: 'Title must be 20 characters or less',
    descriptionTooLong: 'Description must be 10000 characters or less',
    commentTooLong: 'Comment must be 10000 characters or less',
    attachmentTooLarge: 'File must be 5 MB or less',
    attachmentNotReady: 'Please wait for the file upload to finish',
    attachment: 'Attachment',
    currentAttachment: 'Current attachment',
    newAttachment: 'New attachment',
    removeAttachment: 'Remove attachment',
    noAttachment: 'No attachment',
    uploadingFile: 'Uploading file',
    uploadPleaseWait: 'Please wait until the upload finishes.',
    savingTask: 'Saving task...',
    taskSaved: 'Task saved successfully.',
    noTasks: 'No tasks yet. Add your first task!',
    noRecords: 'No records in this column.',
    recordsWithAlert: 'Records with Alert date',
    alertNotSetColumn: 'Alert not set',
    completed: 'Completed',
    open: 'Open',
    noDescription: 'No description provided.',
    created: 'Created',
    updated: 'Updated',
    alert: 'Alert',
    alertNotSet: 'Alert: Not set',
    markOpen: 'Mark Open',
    markDone: 'Mark Done',
    preview: 'View',
    previewTaskTitle: 'View',
    close: 'Close',
    edit: 'Edit',
    editTaskTitle: 'Edit task',
    save: 'Save',
    ok: 'OK',
    cancel: 'Cancel',
    deleteTaskTitle: 'Delete task?',
    deleteTaskMessage: 'This task will be permanently removed.',
    deleteTagTitle: 'Delete tag?',
    deleteTagMessage: '"{tag}" will be removed from your tag list and cleared from matching tasks.',
    deleteUserTitle: 'Delete user?',
    deleteUserMessage: '{username} and all of their tasks will be permanently removed.',
    no: 'No',
    yes: 'Yes',
    userAdded: 'User added.',
    userStatus: 'Status',
    userEnabledStatus: 'Enabled',
    userDisabledStatus: 'Disabled',
    userPendingStatus: 'Pending verification',
    notes: 'Notes',
    enableUser: 'Enable user',
    disableUser: 'Disable user',
    userEnabled: 'User enabled.',
    userDisabled: 'User disabled.',
    taskTitlePrompt: 'Task title (max 20 characters)',
    titleEmpty: 'Title cannot be empty',
    taskDescriptionPrompt: 'Task description (max 10000 characters)',
    reminderPrompt: 'Date time alert (YYYY-MM-DDTHH:mm, leave empty for no alert)',
    sending: 'Sending...',
    emailSent: 'Email sent.',
    emailFailed: 'Could not send email.',
    excelExported: 'Excel exported.',
    pdfExported: 'PDF exported.',
    wordExported: 'Word exported.',
    reminderTitle: 'Reminder',
    taskReminderNow: 'Date time alert: {title} is happening now.',
    dailyQuote: 'Daily Quote',
    quoteAuthor: 'Quote author',
    exportDate: 'Export Date',
    myTasks: 'My Tasks',
    notAvailable: 'N/A',
    dashboardTab: 'Today',
    dashboardTitle: 'Today',
    dashboardCustomize: 'Customize',
    dashboardCustomizeReset: 'Reset to default',
    dashboardDefaultLanding: 'Default landing view',
    dashboardDefaultLandingToday: 'Today',
    dashboardDefaultLandingLastUsed: 'Last used',
    dashboardLiveResumed: 'Live updates resumed',
    dashboardLivePaused: 'Live updates paused',
    dashboardErrorTitle: 'Dashboard could not be loaded',
    dashboardRetry: 'Retry',
    dashboardUpdated: 'Dashboard updated',
    dashboardPreferencesSaved: 'Dashboard preferences saved.',
    dashboardPreferencesReset: 'Dashboard reset to defaults.',
    dashboardPreferencesError: 'Could not save preferences.',
    cardTodaysTasks: 'Today\'s tasks',
    cardTaskStatusSummary: 'Task status',
    cardRecentNotes: 'Recent notes',
    cardBills: 'Bills',
    cardCreditCards: 'Credit cards',
    cardWeather: 'Weather',
    cardDailyQuote: 'Daily quote',
    cardErrorRetry: 'Couldn\'t load this card',
    viewAllTasks: 'View all tasks',
    viewAllNotes: 'View all notes',
    viewAllBills: 'View all bills',
    subOverdue: 'Overdue',
    subToday: 'Today',
    subInProgress: 'In progress',
    subDueSoon: 'Due soon',
    subUndated: 'Undated',
    closesInDays: 'Closes in {n} days',
    markPaid: 'Mark paid',
    markDone: 'Mark done',
    taskMarkedDone: 'Task marked done.',
    billMarkedPaid: 'Bill marked paid.',
    quickAddTask: 'Add task',
    quickNewNote: 'New note',
    untitledNote: 'Untitled note',
    dashboardEmptyTasks: 'No tasks for today',
    dashboardEmptyNotes: 'No notes yet',
    dashboardEmptyBills: 'No bills need attention',
    dashboardEmptyCards: 'No credit cards added',
    dashboardNoApproachingClose: 'No closing dates approaching',
    dashboardEmptyWeather: 'Add a city in Weather',
    dashboardWeatherUnavailable: 'Weather unavailable',
    dashboardQuoteUnavailable: 'Quote unavailable',
    weatherOpenInTab: 'Open the Weather tab to see current conditions.',
    totalBalance: 'Balance',
    totalInterest: 'Total interest',
    moveUp: 'Move up',
    moveDown: 'Move down',
    save: 'Save',
    cancel: 'Cancel',
  },
  vi: {
    appTitle: 'Quản lý công việc',
    appSubtitle: 'Lên kế hoạch, gắn nhãn và theo dõi công việc',
    language: 'Ngôn ngữ',
    darkMode: 'Tối',
    lightMode: 'Sáng',
    switchToDarkMode: 'Chuyển sang chế độ tối',
    switchToLightMode: 'Chuyển sang chế độ sáng',
    rememberMe: 'Ghi nhớ đăng nhập',
    login: 'Đăng nhập',
    signup: 'Đăng ký',
    username: 'Tên đăng nhập',
    name: 'Tên',
    email: 'Email',
    password: 'Mật khẩu',
    showPassword: 'Hiện mật khẩu',
    hidePassword: 'Ẩn mật khẩu',
    submit: 'Gửi',
    yourTasks: 'Công việc của bạn',
    sendEmail: 'Gửi email',
    exportExcel: 'Xuất Excel',
    exportPdf: 'Xuất PDF',
    exportWord: 'Xuất Word',
    logout: 'Đăng xuất',
    userSettings: 'Cài đặt người dùng',
    profileSettings: 'Hồ sơ',
    changePassword: 'Đổi mật khẩu',
    currentPassword: 'Mật khẩu hiện tại',
    newPassword: 'Mật khẩu mới',
    timezone: 'Múi giờ',
    settingsSaved: 'Đã lưu cài đặt.',
    passwordUpdated: 'Đã cập nhật mật khẩu.',
    passwordRequired: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới',
    searchTasks: 'Tìm công việc',
    searchTasksPlaceholder: 'Tìm theo tiêu đề, mô tả hoặc bình luận',
    clearSearch: 'Xóa tìm kiếm',
    noSearchTasks: 'Không có công việc phù hợp với tìm kiếm.',
    title: 'Tiêu đề',
    max20: '(tối đa 20 ký tự)',
    priority: 'Ưu tiên',
    low: 'Thấp',
    medium: 'Trung bình',
    high: 'Cao',
    status: 'Trạng thái',
    tag: 'Nhãn',
    tagPlaceholder: 'Công việc, cá nhân, khẩn cấp...',
    manageTags: 'Quản lý nhãn',
    tagName: 'Tên nhãn',
    addTag: 'Thêm nhãn',
    noTags: 'Chưa có nhãn.',
    tasksForTag: 'Công việc có nhãn "{tag}"',
    clearTagFilter: 'Xóa bộ lọc',
    noTaggedTasks: 'Không có công việc nào khớp với nhãn này.',
    tagRequired: 'Vui lòng nhập tên nhãn.',
    tagTooLong: 'Tên nhãn phải từ 40 ký tự trở xuống',
    tagAdded: 'Đã thêm nhãn.',
    tagUpdated: 'Đã cập nhật nhãn.',
    tagDeleted: 'Đã xóa nhãn.',
    renameTag: 'Đổi tên nhãn',
    todo: 'Cần làm',
    in_progress: 'Đang làm',
    done: 'Hoàn thành',
    description: 'Mô tả',
    descriptionPlaceholder: 'Nhập ghi chú, danh sách và chi tiết tại đây...',
    addComment: 'Thêm bình luận',
    comment: 'Bình luận',
    commentPlaceholder: 'Thêm bình luận về công việc này...',
    max500: '(tối đa 10000 ký tự)',
    dateTimeAlert: 'Lịch nhắc',
    uploadFile: 'Tải tệp lên',
    addTask: 'Thêm công việc',
    manageUsers: 'Người dùng',
    addUser: 'Thêm người dùng',
    editUser: 'Chỉnh sửa người dùng',
    impersonate: 'Đóng vai...',
    impersonateUser: 'Đóng vai người dùng',
    backToAdmin: 'Về Admin',
    impersonatingAs: 'Đang dùng như {username}',
    impersonationStarted: 'Đang xem như {username}.',
    impersonationStopped: 'Đã về admin.',
    userUpdated: 'Đã cập nhật người dùng.',
    id: 'ID',
    tasks: 'Công việc',
    notes: 'Ghi chú',
    newNote: 'Ghi chú mới',
    deleteNote: 'Xóa ghi chú',
    pinNote: 'Ghim ghi chú',
    unpinNote: 'Bỏ ghim ghi chú',
    deleteNoteTitle: 'Xóa ghi chú?',
    deleteNoteMessage: 'Ghi chú này sẽ bị xóa vĩnh viễn.',
    noteSaved: 'Đã lưu',
    noteSaving: 'Đang lưu...',
    notePaste: 'Dán',
    notePasteFailed: 'Không đọc được bộ nhớ tạm',
    linkedTask: 'Công việc liên kết',
    noLinkedTask: 'Không liên kết công việc',
    noteHistory: 'Lịch sử',
    noteHistoryEmpty: 'Chưa có phiên bản trước.',
    previousPage: 'Trước',
    nextPage: 'Tiếp',
    pageStatus: 'Trang {page}/{totalPages} ({total} mục)',
    restoreVersion: 'Khôi phục',
    notesEmpty: 'Chưa có ghi chú. Nhấn + để bắt đầu.',
    notePlaceholderTitle: 'Tiêu đề',
    notePlaceholderBody: 'Bắt đầu viết...',
    untitledNote: 'Ghi chú mới',
    searchNotes: 'Tìm ghi chú',
    archive: 'Lưu trữ',
    archived: 'Đã lưu trữ',
    restore: 'Khôi phục',
    addTaskShortcut: 'Thêm công việc',
    noArchivedTasks: 'Chưa có công việc đã lưu trữ.',
    weather: 'Thời tiết',
    creditCards: 'Tài chính',
    creditCardAccounts: 'Tài chính',
    creditCardSubTab: 'Thẻ tín dụng',
    creditCardInfoSubTab: 'Chi phí',
    transactionsSubTab: 'Giao dịch',
    addTransaction: 'Thêm giao dịch',
    editTransaction: 'Sửa giao dịch',
    importStatement: 'Nhập sao kê PDF',
    importPreviewTitle: 'Nhập sao kê',
    importParsing: 'Đang đọc sao kê…',
    importNoItems: 'Không tìm thấy giao dịch nào trong sao kê này.',
    importConfirm: 'Nhập mục đã chọn',
    importSuccess: 'Đã nhập {count} giao dịch',
    importNotConfigured: 'Chức năng nhập bằng AI chưa được cấu hình.',
    importFailed: 'Nhập sao kê thất bại.',
    transactionAdded: 'Đã thêm giao dịch',
    transactionUpdated: 'Đã cập nhật giao dịch',
    transactionDeleted: 'Đã xóa giao dịch',
    failedToLoadTransactions: 'Không thể tải giao dịch',
    failedToSaveTransaction: 'Không thể lưu giao dịch',
    failedToDeleteTransaction: 'Không thể xóa giao dịch',
    confirmDeleteTransaction: 'Xóa giao dịch này?',
    income: 'Thu nhập',
    expense: 'Chi tiêu',
    fastAccessLinks: 'Trang web thanh toán hóa đơn',
    addFastAccessLink: 'Thêm trang web thanh toán hóa đơn',
    noFastAccessLinks: 'Chưa có trang web thanh toán hóa đơn.',
    fastAccessLinkDeleted: 'Đã xóa trang web thanh toán hóa đơn',
    fastAccessLinkAdded: 'Đã thêm trang web thanh toán hóa đơn',
    monthlyBills: 'Hóa đơn hằng tháng',
    otherSubTab: 'Khác',
    editBill: 'Chỉnh sửa hóa đơn',
    billItem: 'Khoản chi',
    billItemRequired: 'Vui lòng nhập khoản chi.',
    amount: 'Số tiền',
    invalidBillAmount: 'Số tiền không hợp lệ.',
    noBillsToExport: 'Không có dòng chi phí để xuất.',
    dueDate: 'Ngày đến hạn',
    payBefore: 'Thanh toán trước',
    grandTotalIncludingRent: 'Tổng cộng',
    mortgageLink: 'Nhà / thế chấp',
    electricLink: 'Điện',
    waterLink: 'Nước',
    gasLink: 'Gas',
    internetLink: 'Internet',
    phoneLink: 'Điện thoại',
    cardName: 'Số thẻ',
    cardNamePlaceholder: 'Số thẻ hoặc tên gợi nhớ',
    creditCardUser: 'Người dùng',
    creditCardUserPlaceholder: 'Chủ thẻ',
    creditCardIssuer: 'Loại thẻ',
    creditCardIssuerPlaceholder: 'Chọn loại thẻ',
    totalBalance: 'Số dư',
    interestCharge: 'Tiền lãi tính',
    invalidCreditCardIssuer: 'Loại thẻ không hợp lệ.',
    closingDate: 'Ngày chốt sao kê',
    addCard: 'Thêm thẻ',
    addCreditCard: 'Thêm thẻ',
    noCreditCards: 'Chưa có thẻ tín dụng.',
    noCreditCardsToExport: 'Không có thẻ tín dụng để xuất.',
    creditCardAdded: 'Đã thêm thẻ tín dụng.',
    creditCardUpdated: 'Đã cập nhật thẻ tín dụng.',
    creditCardDeleted: 'Đã xóa thẻ tín dụng.',
    deleteCreditCardTitle: 'Xóa thẻ?',
    deleteCreditCardMessage: 'Thẻ {name} sẽ bị xóa vĩnh viễn.',
    deleteFastAccessLinkTitle: 'Xóa trang web thanh toán hóa đơn?',
    deleteFastAccessLinkMessage: '{label} sẽ bị xóa vĩnh viễn.',
    editCreditCard: 'Chỉnh sửa thẻ',
    closingDateSaved: 'Đã lưu ngày chốt sao kê.',
    creditCardNameRequired: 'Vui lòng nhập số thẻ.',
    invalidCreditCardBalance: 'Số dư không hợp lệ.',
    invalidClosingDate: 'Ngày chốt sao kê không hợp lệ.',
    addCity: 'Thêm thành phố',
    cityPlaceholder: 'Tìm thành phố',
    cityNotFound: 'Không tìm thấy thành phố.',
    citySaved: 'Đã thêm thời tiết cho thành phố.',
    noSavedWeatherCities: 'Chưa có thành phố nào được lưu.',
    loadingWeather: 'Đang tải thời tiết...',
    weatherUnable: 'Không thể tải thời tiết.',
    humidity: 'Độ ẩm',
    localTime: 'Giờ địa phương',
    wind: 'Gió',
    actions: 'Thao tác',
    welcome: 'Xin chào, {name}',
    authRequired: 'Vui lòng nhập tên đăng nhập và mật khẩu.',
    emailRequired: 'Vui lòng nhập email hợp lệ.',
    verificationEmailSent: 'Đã đăng ký. Vui lòng xác minh email trước khi đăng nhập.',
    emailVerified: 'Email đã được xác minh. Bạn có thể đăng nhập.',
    resetPassword: 'Đặt lại mật khẩu',
    delete: 'Xóa',
    newPasswordFor: 'Mật khẩu mới cho {username}',
    passwordRequired: 'Vui lòng nhập mật khẩu.',
    passwordUpdated: 'Đã cập nhật mật khẩu.',
    titleRequired: 'Vui lòng nhập tiêu đề.',
    titleTooLong: 'Tiêu đề phải từ 20 ký tự trở xuống',
    descriptionTooLong: 'Mô tả phải từ 10000 ký tự trở xuống',
    commentTooLong: 'Bình luận phải từ 10000 ký tự trở xuống',
    attachmentTooLarge: 'Tệp phải có dung lượng từ 5 MB trở xuống.',
    attachmentNotReady: 'Vui lòng chờ tệp tải lên hoàn tất.',
    attachment: 'Tệp đính kèm',
    currentAttachment: 'Tệp hiện tại',
    newAttachment: 'Tệp mới',
    removeAttachment: 'Gỡ tệp',
    noAttachment: 'Không có tệp đính kèm',
    uploadingFile: 'Đang tải tệp lên',
    uploadPleaseWait: 'Vui lòng chờ đến khi tải lên hoàn tất.',
    savingTask: 'Đang lưu công việc...',
    taskSaved: 'Đã lưu công việc.',
    noTasks: 'Chưa có công việc. Hãy thêm công việc đầu tiên!',
    noRecords: 'Không có bản ghi trong cột này.',
    recordsWithAlert: 'Bản ghi có ngày nhắc',
    alertNotSetColumn: 'Chưa đặt nhắc',
    completed: 'Hoàn thành',
    open: 'Đang mở',
    noDescription: 'Không có mô tả.',
    created: 'Đã tạo',
    updated: 'Đã cập nhật',
    alert: 'Lịch nhắc',
    alertNotSet: 'Lịch nhắc: Chưa đặt',
    markOpen: 'Mở lại',
    markDone: 'Đánh dấu xong',
    preview: 'Xem',
    previewTaskTitle: 'Xem',
    close: 'Đóng',
    edit: 'Chỉnh sửa',
    editTaskTitle: 'Chỉnh sửa công việc',
    save: 'Lưu',
    ok: 'OK',
    cancel: 'Hủy',
    deleteTaskTitle: 'Xóa công việc?',
    deleteTaskMessage: 'Công việc này sẽ bị xóa vĩnh viễn.',
    deleteTagTitle: 'Xóa nhãn?',
    deleteTagMessage: '"{tag}" sẽ bị xóa khỏi danh sách nhãn và gỡ khỏi các công việc phù hợp.',
    deleteUserTitle: 'Xóa người dùng?',
    deleteUserMessage: '{username} và tất cả công việc của người dùng này sẽ bị xóa vĩnh viễn.',
    no: 'Không',
    yes: 'Có',
    userAdded: 'Đã thêm người dùng.',
    userStatus: 'Trạng thái',
    userEnabledStatus: 'Đang bật',
    userDisabledStatus: 'Đã tắt',
    userPendingStatus: 'Chờ xác minh',
    notes: 'Ghi chú',
    enableUser: 'Bật người dùng',
    disableUser: 'Tắt người dùng',
    userEnabled: 'Đã bật người dùng.',
    userDisabled: 'Đã tắt người dùng.',
    taskTitlePrompt: 'Tiêu đề công việc (tối đa 20 ký tự)',
    titleEmpty: 'Tiêu đề không được để trống.',
    taskDescriptionPrompt: 'Mô tả công việc (tối đa 10000 ký tự)',
    reminderPrompt: 'Ngày giờ nhắc (YYYY-MM-DDTHH:mm, để trống nếu không nhắc)',
    sending: 'Đang gửi...',
    emailSent: 'Đã gửi email.',
    emailFailed: 'Không thể gửi email.',
    excelExported: 'Đã xuất Excel.',
    pdfExported: 'Đã xuất PDF.',
    wordExported: 'Đã xuất Word.',
    reminderTitle: 'Nhắc việc',
    taskReminderNow: 'Đã đến giờ cho công việc: {title}.',
    dailyQuote: 'Câu nói hôm nay',
    quoteAuthor: 'Tác giả',
    exportDate: 'Ngày xuất',
    myTasks: 'Công việc của tôi',
    notAvailable: 'Không có',
    dashboardTab: 'Hôm nay',
    dashboardTitle: 'Hôm nay',
    dashboardCustomize: 'Tuỳ chỉnh',
    dashboardCustomizeReset: 'Khôi phục mặc định',
    dashboardDefaultLanding: 'Trang mặc định khi mở app',
    dashboardDefaultLandingToday: 'Hôm nay',
    dashboardDefaultLandingLastUsed: 'Trang gần nhất',
    dashboardLiveResumed: 'Đã kết nối lại',
    dashboardLivePaused: 'Tạm dừng cập nhật trực tiếp',
    dashboardErrorTitle: 'Không thể tải Dashboard',
    dashboardRetry: 'Thử lại',
    dashboardUpdated: 'Dashboard đã cập nhật',
    dashboardPreferencesSaved: 'Đã lưu tuỳ chỉnh Dashboard.',
    dashboardPreferencesReset: 'Đã khôi phục Dashboard mặc định.',
    dashboardPreferencesError: 'Không thể lưu tuỳ chỉnh.',
    cardTodaysTasks: 'Việc hôm nay',
    cardTaskStatusSummary: 'Trạng thái công việc',
    cardRecentNotes: 'Ghi chú gần đây',
    cardBills: 'Hóa đơn',
    cardCreditCards: 'Thẻ tín dụng',
    cardWeather: 'Thời tiết',
    cardDailyQuote: 'Câu nói hôm nay',
    cardErrorRetry: 'Không thể tải thẻ này',
    viewAllTasks: 'Xem tất cả công việc',
    viewAllNotes: 'Xem tất cả ghi chú',
    viewAllBills: 'Xem tất cả hóa đơn',
    subOverdue: 'Quá hạn',
    subToday: 'Hôm nay',
    subInProgress: 'Đang làm',
    subDueSoon: 'Sắp đến hạn',
    subUndated: 'Chưa có ngày',
    closesInDays: 'Còn {n} ngày đến hạn chốt',
    markPaid: 'Đánh dấu đã trả',
    markDone: 'Đánh dấu hoàn thành',
    taskMarkedDone: 'Đã đánh dấu hoàn thành.',
    billMarkedPaid: 'Đã đánh dấu đã trả.',
    quickAddTask: 'Thêm việc',
    quickNewNote: 'Ghi chú mới',
    untitledNote: 'Ghi chú không tên',
    dashboardEmptyTasks: 'Hôm nay không có việc',
    dashboardEmptyNotes: 'Chưa có ghi chú',
    dashboardEmptyBills: 'Không có hóa đơn cần xử lý',
    dashboardEmptyCards: 'Chưa thêm thẻ tín dụng',
    dashboardNoApproachingClose: 'Không có thẻ nào sắp đến ngày chốt',
    dashboardEmptyWeather: 'Thêm thành phố trong tab Thời tiết',
    dashboardWeatherUnavailable: 'Không tải được thời tiết',
    dashboardQuoteUnavailable: 'Không tải được câu nói',
    weatherOpenInTab: 'Mở tab Thời tiết để xem chi tiết.',
    totalBalance: 'Tổng dư nợ',
    totalInterest: 'Tổng lãi',
    moveUp: 'Di chuyển lên',
    moveDown: 'Di chuyển xuống',
    save: 'Lưu',
    cancel: 'Huỷ',
  },
};

const t = (key, values = {}) => {
  const template = translations[currentLanguage]?.[key] || translations.en[key] || key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, value),
    template
  );
};

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

const priorityLabel = (priority = 'medium') => t(priority || 'medium');

const priorityRank = (priority = 'medium') => ({
  high: 0,
  medium: 1,
  low: 2,
}[priority] ?? 3);

const sortTasksByPriority = (taskList = []) => [...taskList].sort((first, second) => (
  priorityRank(first.priority) - priorityRank(second.priority)
));

const taskStatus = (task) => task.status || (task.completed ? 'done' : 'todo');

const statusLabel = (status = 'todo') => t(status || 'todo');

const updatePriorityOptions = (select) => {
  if (!select) return;
  select.querySelector('option[value="low"]').textContent = t('low');
  select.querySelector('option[value="medium"]').textContent = t('medium');
  select.querySelector('option[value="high"]').textContent = t('high');
};

const updateStatusOptions = (select) => {
  if (!select) return;
  select.querySelector('option[value="todo"]').textContent = t('todo');
  select.querySelector('option[value="in_progress"]').textContent = t('in_progress');
  select.querySelector('option[value="done"]').textContent = t('done');
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
  setText('label[for="language-select"]', t('language'));
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
  weatherCityInput.placeholder = t('cityPlaceholder');
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
  setText('#archived-subtab', t('archive'));
  setText('#tag-subtab', t('tag'));
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
  setText('label[for="task-description"]', `${t('description')} ${t('max500')}`);
  document.getElementById('task-description').setAttribute('data-placeholder', t('descriptionPlaceholder'));
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
  editTaskTitle.textContent = t('editTaskTitle');
  previewTaskTitle.textContent = t('previewTaskTitle');
  setText('label[for="preview-task-comment-input"]', t('comment'));
  previewTaskCommentInput.setAttribute('data-placeholder', t('commentPlaceholder'));
  setActionIconButton(sendPreviewTaskEmail, t('sendEmail'), '✉');
  setActionIconButton(editPreviewTask, t('edit'), '✎');
  setActionIconButton(savePreviewComment, t('save'), '✓');
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
  setText('label[for="edit-task-description-input"]', `${t('description')} ${t('max500')}`);
  editTaskDescriptionInput.setAttribute('data-placeholder', t('descriptionPlaceholder'));
  setText('label[for="edit-task-comment-input"]', t('addComment'));
  editTaskCommentInput.setAttribute('data-placeholder', t('commentPlaceholder'));
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
  if (currentUser && currentView === 'weather') renderWeatherView();
  if (currentUser && currentView === 'credit-cards') creditCardModule.render();
  if (currentUser && currentView === 'admin') renderUsers(users);
};

// Helper function to format date in EST (New York)
const formatDateEST = (dateString) => {
  const date = new Date(dateString);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  const parts = formatter.formatToParts(date);
  const formattedParts = {};
  parts.forEach(part => {
    formattedParts[part.type] = part.value;
  });
  return `${formattedParts.month}/${formattedParts.day}/${formattedParts.year}, ${formattedParts.hour}:${formattedParts.minute}:${formattedParts.second} ${formattedParts.dayPeriod} EST (NYC)`;
};

const formatLocalDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

const isTodayDateTimeValue = (value) => {
  if (!value) return false;
  const [datePart] = value.split('T');
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return datePart === `${year}-${month}-${day}`;
};

const closePickerAfterTodaySelection = (input) => {
  const dismissIfToday = () => {
    if (isTodayDateTimeValue(input.value)) {
      setTimeout(() => input.blur(), 0);
    }
  };

  input.addEventListener('input', dismissIfToday);
  input.addEventListener('change', dismissIfToday);
};

const richTextAllowedTags = new Set(['A', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'UL', 'OL', 'LI', 'P', 'DIV', 'BR', 'LABEL', 'INPUT', 'SPAN']);

const hasRichTextMarkup = (value = '') => /<\/?(a|b|strong|i|em|u|s|strike|del|ul|ol|li|p|div|br|label|input|span)\b/i.test(value);

const isSafeLinkHref = (href = '') => /^(https?:|mailto:)/i.test(href);

const autolinkPlainUrls = (html = '') => html.replace(
  /(^|[\s>])((https?:\/\/)[^\s<]+)/gi,
  (match, prefix, url) => `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
);

const linkifyPlainText = (value = '') => autolinkPlainUrls(escapeHtml(value)).replace(/\n/g, '<br>');

const renderStoredRichText = (value = '') => (
  hasRichTextMarkup(value) ? sanitizeRichText(value) : linkifyPlainText(value)
);

const sanitizeRichText = (html = '') => {
  const template = document.createElement('template');
  template.innerHTML = autolinkPlainUrls(html);

  template.content.querySelectorAll('*').forEach((element) => {
    const style = element.getAttribute('style') || '';
    if (element.tagName === 'SPAN' && /text-decoration[^;:]*:\s*[^;]*line-through|text-decoration-line[^;:]*:\s*[^;]*line-through/i.test(style)) {
      const strike = document.createElement('s');
      strike.append(...element.childNodes);
      element.replaceWith(strike);
      return;
    }

    const href = element.tagName === 'A' ? element.getAttribute('href') || '' : '';
    const inputType = element.tagName === 'INPUT' ? (element.getAttribute('type') || '').toLowerCase() : '';
    const isChecked = element.tagName === 'INPUT' && (element.checked || element.hasAttribute('checked'));
    const className = element.getAttribute('class') || '';
    [...element.attributes].forEach((attribute) => element.removeAttribute(attribute.name));

    if (!richTextAllowedTags.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }

    if (element.tagName === 'A') {
      if (!isSafeLinkHref(href)) {
        element.replaceWith(...element.childNodes);
        return;
      }
      element.href = href;
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
    }

    if (element.tagName === 'INPUT') {
      if (inputType !== 'checkbox') {
        element.remove();
        return;
      }
      element.type = 'checkbox';
      element.className = 'rich-check-input';
      element.setAttribute('data-rich-checklist', 'true');
      if (isChecked) element.setAttribute('checked', '');
      return;
    }

    if (element.tagName === 'LABEL' && className.includes('rich-check-item')) {
      element.className = `rich-check-item${element.querySelector('input[type="checkbox"]:checked') ? ' checked' : ''}`;
      return;
    }

    if (element.tagName === 'SPAN' && className.includes('rich-check-text')) {
      element.className = 'rich-check-text';
    }
  });

  return template.innerHTML.trim();
};

const getRichTextPlainText = (html = '') => {
  if (!hasRichTextMarkup(html)) return String(html || '').trim();
  const container = document.createElement('div');
  container.innerHTML = sanitizeRichText(html);
  return container.textContent.trim();
};

const taskMatchesSearch = (task, query) => {
  if (!query) return true;
  const haystack = [
    task.title,
    getRichTextPlainText(task.description || ''),
    getRichTextPlainText(task.comment || ''),
  ].join(' ').toLowerCase();
  return haystack.includes(query);
};

const updateTaskSearchState = () => {
  clearTaskSearch.classList.toggle('hidden', !taskSearchInput.value.trim());
};

const setRichEditorValue = (editor, value = '') => {
  if (hasRichTextMarkup(value)) {
    editor.innerHTML = sanitizeRichText(value);
    return;
  }

  editor.textContent = value;
};

const getRichEditorValue = (editor) => {
  const html = sanitizeRichText(editor.innerHTML);
  return getRichTextPlainText(html) ? html : '';
};

const getRichEditorLength = (editor) => getRichTextPlainText(editor.innerHTML).length;

const syncChecklistItem = (checkbox) => {
  const item = checkbox.closest('.rich-check-item');
  checkbox.toggleAttribute('checked', checkbox.checked);
  if (item) item.classList.toggle('checked', checkbox.checked);
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

const insertChecklistItem = (editor) => {
  editor.focus();
  restoreRichEditorSelection(editor);
  const id = `check-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  document.execCommand(
    'insertHTML',
    false,
    `<div><label class="rich-check-item"><input id="${id}" class="rich-check-input" data-rich-checklist="true" type="checkbox"> <span class="rich-check-text">Checklist item</span></label></div>`
  );
  editor.innerHTML = sanitizeRichText(editor.innerHTML);
  saveRichEditorSelection(editor);
};

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

const richEditorSelections = new WeakMap();

const saveRichEditorSelection = (editor) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  if (editor.contains(range.commonAncestorContainer)) {
    richEditorSelections.set(editor, range.cloneRange());
  }
};

const restoreRichEditorSelection = (editor) => {
  const range = richEditorSelections.get(editor);
  if (!range) return false;

  const selection = window.getSelection();
  if (!selection) return false;

  selection.removeAllRanges();
  selection.addRange(range);
  return true;
};

const setupRichTextEditors = () => {
  document.querySelectorAll('.rich-editor-toolbar button').forEach((button) => {
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
    });

    button.addEventListener('click', () => {
      const editor = document.getElementById(button.dataset.editor);
      if (!editor) return;

      editor.focus();
      restoreRichEditorSelection(editor);
      if (button.dataset.command === 'insertChecklist') {
        insertChecklistItem(editor);
        return;
      }
      document.execCommand(button.dataset.command, false, null);
      saveRichEditorSelection(editor);
    });
  });

  document.querySelectorAll('.rich-editor-surface').forEach((editor) => {
    editor.addEventListener('keyup', () => saveRichEditorSelection(editor));
    editor.addEventListener('mouseup', () => saveRichEditorSelection(editor));
    editor.addEventListener('input', () => saveRichEditorSelection(editor));

    editor.addEventListener('change', (event) => {
      if (event.target.matches('input[data-rich-checklist]')) {
        syncChecklistItem(event.target);
        saveRichEditorSelection(editor);
      }
    });

    editor.addEventListener('blur', () => {
      saveRichEditorSelection(editor);
      editor.innerHTML = sanitizeRichText(editor.innerHTML);
    });

    editor.addEventListener('paste', (event) => {
      event.preventDefault();
      const text = event.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    });
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

const renderQuoteWidget = () => {
  const quoteWidget = document.getElementById('quote-widget');
  if (!quoteWidget) return;
  quoteWidget.innerHTML = getDailyQuoteCard(DEFAULT_DAILY_QUOTE);
  quoteWidget.classList.remove('hidden');
  loadDailyQuote(quoteWidget);
};

const getDailyQuoteDateKey = () => new Date().toISOString().slice(0, 10);

const getCachedDailyQuote = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(DAILY_QUOTE_CACHE_KEY));
    if (cached?.date === getDailyQuoteDateKey() && cached.quote?.text) {
      return cached.quote;
    }
  } catch {
    localStorage.removeItem(DAILY_QUOTE_CACHE_KEY);
  }
  return null;
};

const saveCachedDailyQuote = (quote) => {
  localStorage.setItem(DAILY_QUOTE_CACHE_KEY, JSON.stringify({
    date: getDailyQuoteDateKey(),
    quote,
  }));
};

const fetchDailyQuote = async () => {
  const response = await fetch(DAILY_QUOTE_API_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Quote request failed');
  }

  const data = await response.json();
  const quote = data.quote || (Array.isArray(data) ? data[0] : data);
  return {
    text: quote?.q || quote?.quote || quote?.text || DEFAULT_DAILY_QUOTE.text,
    author: quote?.a || quote?.author || '',
  };
};

const loadDailyQuote = async (quoteWidget) => {
  const cachedQuote = getCachedDailyQuote();
  if (cachedQuote) {
    quoteWidget.innerHTML = getDailyQuoteCard(cachedQuote);
    return;
  }

  try {
    const quote = await fetchDailyQuote();
    saveCachedDailyQuote(quote);
    quoteWidget.innerHTML = getDailyQuoteCard(quote);
  } catch (error) {
    console.error('Failed to load daily quote:', error);
    quoteWidget.innerHTML = getDailyQuoteCard({
      text: 'Unable to load today\'s quote.',
      author: '',
    });
  }
};

const getDailyQuoteCard = (quote) => {
  const author = quote.author || t('notAvailable');
  return `
    <section class="daily-quote" aria-label="${escapeHtml(t('dailyQuote'))}">
      <div class="daily-quote-label">${escapeHtml(t('dailyQuote'))}</div>
      <p>${escapeHtml(quote.text)}</p>
      <div class="daily-quote-author">${escapeHtml(t('quoteAuthor'))}: ${escapeHtml(author)}</div>
    </section>
  `;
};

const getLegacySavedWeatherCitiesKey = () => `${WEATHER_CACHE_PREFIX}-${currentUser?.id || 'guest'}`;

const loadLegacySavedWeatherCities = () => {
  try {
    return JSON.parse(localStorage.getItem(getLegacySavedWeatherCitiesKey())) || [];
  } catch {
    return [];
  }
};

const migrateLegacyWeatherCities = async () => {
  if (!currentUser) return;

  const migrationKey = `task-manager-weather-db-migrated-${currentUser.id}`;
  if (sessionStorage.getItem(migrationKey)) return;

  const legacyCities = loadLegacySavedWeatherCities()
    .filter((city) => city && city.latitude !== undefined && city.longitude !== undefined);

  if (!legacyCities.length) {
    sessionStorage.setItem(migrationKey, 'true');
    return;
  }

  await Promise.all(legacyCities.map((city) => request('/api/weather-cities', {
    method: 'POST',
    body: JSON.stringify({
      weather_key: city.weather_key || city.id,
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
    }),
  })));

  localStorage.removeItem(getLegacySavedWeatherCitiesKey());
  sessionStorage.setItem(migrationKey, 'true');
};

const loadSavedWeatherCities = async () => {
  await migrateLegacyWeatherCities();
  const result = await request('/api/weather-cities');
  if (result.error) {
    throw new Error(result.error);
  }
  return result.cities || [];
};

const saveSavedWeatherCity = async (city) => {
  const result = await request('/api/weather-cities', {
    method: 'POST',
    body: JSON.stringify(city),
  });
  if (result.error) {
    throw new Error(result.error);
  }
  return result.city;
};

const deleteSavedWeatherCity = async (id) => {
  const result = await request(`/api/weather-cities/${id}`, {
    method: 'DELETE',
  });
  if (result.error) {
    throw new Error(result.error);
  }
  return result;
};

const normalizeWeatherCityName = (match) => (
  [match.name, match.country].filter(Boolean).join(', ')
);

const fetchWeatherCityMatch = async (city) => {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  );
  if (!response.ok) {
    throw new Error('City request failed');
  }

  const data = await response.json();
  return data.results?.[0] || null;
};

const fetchWeatherData = async (latitude, longitude) => {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,is_day&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`
  );
  if (!response.ok) {
    throw new Error('Weather request failed');
  }
  return response.json();
};

const getWeatherIcon = (weatherCode) => {
  if (weatherCode === 0 || weatherCode === 1) return 'Clear';
  if (weatherCode === 2 || weatherCode === 3) return 'Clouds';
  if (weatherCode === 45 || weatherCode === 48) return 'Fog';
  if (weatherCode >= 51 && weatherCode <= 67) return 'Rain';
  if (weatherCode >= 71 && weatherCode <= 77) return 'Snow';
  if (weatherCode >= 80 && weatherCode <= 82) return 'Showers';
  if (weatherCode >= 85 && weatherCode <= 86) return 'Snow';
  if (weatherCode >= 95) return 'Storm';
  return 'Weather';
};

const getWeatherCard = (city, weatherData) => {
  const current = weatherData.current || {};
  const tempF = Math.round(Number(current.temperature_2m));
  const tempC = Math.round((tempF - 32) * 5 / 9);
  const timezone = weatherData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTime = new Date().toLocaleString(currentLanguage === 'vi' ? 'vi-VN' : 'en-US', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `
    <article class="weather-card weather-${escapeHtml(getWeatherIcon(current.weather_code)).toLowerCase()}">
      <div class="weather-animation"></div>
      <div class="weather-card-top">
        <div>
          <div class="weather-card-kicker">${escapeHtml(getWeatherIcon(current.weather_code))}</div>
          <h4>${escapeHtml(city.name || t('weather'))}</h4>
        </div>
        <button class="weather-remove" type="button" data-weather-id="${escapeHtml(city.id)}" aria-label="${escapeHtml(t('delete'))} ${escapeHtml(city.name || t('weather'))}" title="${escapeHtml(t('delete'))}">x</button>
      </div>
      <div class="weather-temp">${Number.isFinite(tempF) ? `${tempF}°F / ${tempC}°C` : t('notAvailable')}</div>
      <div class="weather-meta">
        <span><strong>${escapeHtml(t('humidity'))}</strong>${current.relative_humidity_2m ?? t('notAvailable')}%</span>
        <span><strong>${escapeHtml(t('wind'))}</strong>${current.wind_speed_10m ?? t('notAvailable')} mph</span>
        <span><strong>${escapeHtml(t('localTime'))}</strong>${escapeHtml(localTime)}</span>
      </div>
    </article>
  `;
};

const renderWeatherView = async () => {
  weatherMessage.textContent = t('loadingWeather');
  weatherList.innerHTML = '';

  let cities = [];
  try {
    cities = (await loadSavedWeatherCities())
    .filter((city) => city && city.latitude !== undefined && city.longitude !== undefined);
  } catch (error) {
    console.error('Failed to load saved weather cities:', error);
    weatherMessage.textContent = t('weatherUnable');
    return;
  }

  if (!cities.length) {
    weatherMessage.textContent = '';
    weatherList.innerHTML = `<p class="weather-empty">${escapeHtml(t('noSavedWeatherCities'))}</p>`;
    return;
  }

  const cards = await Promise.all(cities.map(async (city) => {
    try {
      const weatherData = await fetchWeatherData(city.latitude, city.longitude);
      return getWeatherCard(city, weatherData);
    } catch (error) {
      console.error('Failed to load city weather:', error);
      return `
        <article class="weather-card weather-card-error">
          <h4>${escapeHtml(city.name || t('weather'))}</h4>
          <p>${escapeHtml(t('weatherUnable'))}</p>
        </article>
      `;
    }
  }));

  weatherMessage.textContent = '';
  weatherList.innerHTML = cards.join('');
};

const handleWeatherSubmit = async (event) => {
  event.preventDefault();
  const city = weatherCityInput.value.trim();
  if (!city) {
    weatherCityInput.focus();
    return;
  }

  weatherMessage.textContent = t('loadingWeather');

  try {
    const match = await fetchWeatherCityMatch(city);
    if (!match) {
      weatherMessage.textContent = t('cityNotFound');
      return;
    }

    const cityRecord = {
      weather_key: `${Number(match.latitude).toFixed(3)},${Number(match.longitude).toFixed(3)}`,
      name: normalizeWeatherCityName(match),
      latitude: match.latitude,
      longitude: match.longitude,
    };
    await saveSavedWeatherCity(cityRecord);
    weatherCityInput.value = '';
    showStatusToast(t('citySaved'));
    renderWeatherView();
  } catch (error) {
    console.error('Failed to save weather city:', error);
    weatherMessage.textContent = t('weatherUnable');
  }
};

const handleWeatherListClick = async (event) => {
  const removeButton = event.target.closest('.weather-remove');
  if (!removeButton) return;

  const weatherId = removeButton.dataset.weatherId;
  try {
    await deleteSavedWeatherCity(weatherId);
    renderWeatherView();
  } catch (error) {
    console.error('Failed to delete weather city:', error);
    weatherMessage.textContent = t('weatherUnable');
  }
};

const isTaskWorkspaceView = () => ['tasks', 'archived', 'tags'].includes(currentView);

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
  taskSubtabNav.classList.toggle('hidden', !showTaskWorkspace);
  setActiveTaskSubtab();
  quoteWidget?.classList.add('hidden');
  taskHeader.classList.toggle('hidden', showWeather || showTags);
  tagManager.classList.toggle('hidden', !showTags);
  taskList.classList.toggle('hidden', showWeather || showTags);
  weatherSection.classList.toggle('hidden', !showWeather);

  if (showWeather) {
    renderWeatherView();
    return;
  }

  if (showTags) {
    quoteWidget?.classList.add('hidden');
    taskForm.classList.add('hidden');
    loadTags();
    loadTasks();
    return;
  }

  taskForm.classList.toggle('hidden', currentView === 'archived');
  loadTags();
  loadTasks();
};

const showAddTaskModal = () => {
  taskPriorityInput.value = DEFAULT_TASK_PRIORITY;
  addTaskModal.classList.remove('hidden');
  document.getElementById('task-title').focus();
};

const openAddTaskFlow = () => {
  setCurrentView('tasks');
  showSection();
  showAddTaskModal();
};

const hideAddTaskModal = () => {
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

  const addTaskButton = document.createElement('button');
  addTaskButton.type = 'button';
  addTaskButton.className = 'secondary add-task-shortcut';
  addTaskButton.textContent = '+';
  addTaskButton.setAttribute('aria-label', t('addTaskShortcut'));
  addTaskButton.title = t('addTaskShortcut');
  addTaskButton.addEventListener('click', openAddTaskFlow);

  const dashboardButton = document.createElement('button');
  dashboardButton.type = 'button';
  dashboardButton.className = `secondary nav-button ${currentView === 'dashboard' ? 'active-nav' : ''}`;
  setNavButtonContent(dashboardButton, t('dashboardTab'), '◎');
  dashboardButton.addEventListener('click', () => {
    setCurrentView('dashboard');
    showSection();
  });

  userArea.append(addTaskButton, dashboardButton, notesButton, tasksButton, weatherButton, creditCardsButton);

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

const setLanguage = (language) => {
  currentLanguage = language;
  localStorage.setItem('task-manager-language', language);
  languageSelect.value = language;
  applyTranslations();
};

const getBrowserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (_error) {
    return 'UTC';
  }
};

const getActiveTimezone = () => currentTimezone || currentUser?.timezone || getBrowserTimezone();

const applyUserPreferences = (user) => {
  currentTimezone = user?.timezone || null;
  if (user?.language && translations[user.language]) {
    currentLanguage = user.language;
    localStorage.setItem('task-manager-language', user.language);
    languageSelect.value = user.language;
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

const handlePasswordSettingsSubmit = async (event) => {
  event.preventDefault();
  setSettingsError(passwordSettingsFormError, '');

  const currentPassword = settingsCurrentPasswordInput.value;
  const newPassword = settingsNewPasswordInput.value;
  if (!currentPassword || !newPassword) {
    setSettingsError(passwordSettingsFormError, t('passwordRequired'));
    return;
  }

  const result = await request('/api/me/password', {
    method: 'PUT',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  if (result.error) {
    setSettingsError(passwordSettingsFormError, result.error);
    return;
  }

  passwordSettingsForm.reset();
  trackEvent('password_changed');
  showStatusToast(t('passwordUpdated'));
};

const persistCurrentUserPreferences = async () => {
  if (!currentUser) return;
  const result = await request('/api/me', {
    method: 'PUT',
    body: JSON.stringify({
      name: currentUser.name || '',
      email: currentUser.email || '',
      timezone: getActiveTimezone(),
      language: currentLanguage,
    }),
  });
  if (!result.error) {
    currentUser = result.user;
    applyUserPreferences(currentUser);
  }
};

const togglePasswordVisibility = () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  togglePasswordButton.setAttribute('aria-pressed', String(isHidden));
  togglePasswordButton.setAttribute('aria-label', isHidden ? t('hidePassword') : t('showPassword'));
};

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  try {
    return await response.json();
  } catch (error) {
    return { error: `Request failed (${response.status} ${response.statusText || ''})`.trim() };
  }
};

const getSelectedWeekdays = (container = weeklyOptions) => {
  const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.value).join(',');
};

const setSelectedWeekdays = (container, days = '') => {
  const selectedDays = new Set(String(days || '').split(',').filter(Boolean));
  container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = selectedDays.has(checkbox.value);
  });
};

const syncRecurrenceOptions = ({ checkbox, options, pattern, daily, weekly }) => {
  const isRecurring = checkbox.checked;
  const currentPattern = pattern.value;
  options.classList.toggle('hidden', !isRecurring);
  daily.classList.toggle('hidden', !isRecurring || currentPattern !== 'daily');
  weekly.classList.toggle('hidden', !isRecurring || currentPattern !== 'weekly');
};

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

const resetUserPassword = async (user) => {
  const password = prompt(t('newPasswordFor', { username: user.username }));
  if (password === null) return;
  if (!password.trim()) {
    alert(t('passwordRequired'));
    return;
  }

  const result = await request(`/api/admin/users/${user.id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });

  if (result.error) {
    alert(result.error);
    return;
  }

  alert(t('passwordUpdated'));
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
  const reminder_at = taskReminderInput.value || null;
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
        title, tag, description, priority, status, reminder_at, attachment: preparedAttachment, language: currentLanguage,
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
  deleteConfirmTitle.textContent = t('deleteNoteTitle');
  deleteConfirmMessage.textContent = t('deleteNoteMessage');
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
  deleteConfirmModal.classList.add('hidden');
};

confirmDeleteNo.addEventListener('click', hideDeleteConfirm);

confirmDeleteYes.addEventListener('click', async () => {
  if (!pendingDeleteTaskId && !pendingDeleteUser && !pendingDeleteTag && !pendingDeleteCard && !pendingDeleteFastAccessLink && !pendingDeleteNote) return;
  const taskId = pendingDeleteTaskId;
  const user = pendingDeleteUser;
  const tag = pendingDeleteTag;
  const card = pendingDeleteCard;
  const fastAccessLink = pendingDeleteFastAccessLink;
  const note = pendingDeleteNote;
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

cancelAddTask.addEventListener('click', hideAddTaskModal);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !deleteConfirmModal.classList.contains('hidden')) {
    hideDeleteConfirm();
  }

  if (event.key === 'Escape' && !editTagModal.classList.contains('hidden')) {
    hideEditTagModal();
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

const formatDateTimeLocalValue = (dateString) => {
  if (!dateString) return '';
  return dateString.slice(0, 16);
};

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
  editTaskReminderInput.value = formatDateTimeLocalValue(task.reminder_at);
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
  const reminderAt = editTaskReminderInput.value || null;
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
    reminder_at: reminderAt,
    is_recurring: isRecurring,
    recurrence_pattern: recurrencePattern,
    recurrence_interval: recurrenceInterval,
    recurrence_days: recurrenceDays
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
  savePreviewComment.classList.add('hidden');
  previewTaskModal.classList.remove('hidden');
};

const hidePreviewTaskModal = () => {
  pendingPreviewTask = null;
  previewTaskModal.classList.add('hidden');
  previewTaskDescription.textContent = '';
  previewTaskCommentDisplay.textContent = '';
  previewTaskCommentDisplay.classList.add('hidden');
  previewTaskCommentInput.closest('.rich-editor')?.classList.remove('hidden');
  previewTaskCommentInput.innerHTML = '';
  previewTaskCommentInput.contentEditable = 'true';
  savePreviewComment.classList.remove('hidden');
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

savePreviewComment.addEventListener('click', async () => {
  if (!pendingPreviewTask) return;
  const task = pendingPreviewTask;
  const comment = getRichEditorValue(previewTaskCommentInput);
  if (getRichTextPlainText(comment).length > MAX_TASK_TEXT_LENGTH) {
    showStatusToast(t('commentTooLong'), 'error');
    return;
  }
  hidePreviewTaskModal();
  const result = await updateTask(task.id, { comment });
  if (!result?.error) {
    showStatusToast(t('taskSaved'));
  }
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

const hideStatusToast = () => {
  statusToast.classList.add('hidden');
};

const showStatusToast = (message, tone = 'success', options = {}) => {
  if (statusToastTimer) {
    clearTimeout(statusToastTimer);
    statusToastTimer = null;
  }

  statusToast.textContent = message;
  statusToast.classList.toggle('status-toast-error', tone === 'error');
  statusToast.classList.remove('hidden');
  if (options.persist) {
    return;
  }
  statusToastTimer = setTimeout(() => {
    hideStatusToast();
    statusToastTimer = null;
  }, tone === 'error' ? 3500 : 2000);
};

const setUploadProgress = (percent, message = t('uploadPleaseWait')) => {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  uploadProgressText.textContent = message;
  uploadProgressFill.style.width = `${safePercent}%`;
  uploadProgressPercent.textContent = `${safePercent}%`;
};

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
};

const showUploadProgress = () => {
  uploadProgressTitle.textContent = t('uploadingFile');
  setUploadProgress(0);
  appContainer.inert = true;
  appContainer.setAttribute('aria-busy', 'true');
  uploadProgressOverlay.classList.remove('hidden');
  document.body.classList.add('is-uploading');
};

const hideUploadProgress = () => {
  uploadProgressOverlay.classList.add('hidden');
  appContainer.inert = false;
  appContainer.removeAttribute('aria-busy');
  document.body.classList.remove('is-uploading');
  setUploadProgress(0);
};

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

const exportToExcel = () => {
  const currentDateTime = new Date().toLocaleString('en-US', { 
    timeZone: 'America/New_York'
  }) + ' EST (NYC)';
  
  const data = tasks.map(task => ({
    [t('exportDate')]: currentDateTime,
    [t('title')]: task.title,
    [t('tag')]: task.tag || '',
    [t('priority')]: priorityLabel(task.priority),
    [t('status')]: statusLabel(taskStatus(task)),
    [t('description')]: getRichTextPlainText(task.description),
    [t('comment')]: task.comment || '',
    [t('attachment')]: task.attachment_name || '',
    [t('completed')]: task.completed ? t('yes') : t('no'),
    [t('dateTimeAlert')]: task.reminder_at ? formatLocalDateTime(task.reminder_at) : '',
    [t('created')]: formatDateEST(task.created_at),
    [t('updated')]: formatDateEST(task.updated_at)
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('tasks'));
  XLSX.writeFile(wb, 'tasks.xlsx');
  showStatusToast(t('excelExported'));
};

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const loadPdfUnicodeFont = async (doc) => {
  const fontName = 'TaskManagerUnicode';
  if (!window.taskManagerPdfFontBase64) {
    const response = await fetch('fonts/arial.ttf');
    if (!response.ok) {
      throw new Error('Unable to load PDF font');
    }
    window.taskManagerPdfFontBase64 = arrayBufferToBase64(await response.arrayBuffer());
  }

  doc.addFileToVFS('arial.ttf', window.taskManagerPdfFontBase64);
  doc.addFont('arial.ttf', fontName, 'normal');
  doc.setFont(fontName, 'normal');
};

const exportToPdf = async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  try {
    await loadPdfUnicodeFont(doc);
  } catch (error) {
    console.warn('PDF Unicode font could not be loaded:', error);
  }

  const currentDateTime = new Date().toLocaleString('en-US', { 
    timeZone: 'America/New_York'
  }) + ' EST (NYC)';
  
  doc.setFontSize(16);
  doc.text(t('myTasks'), 20, 20);
  doc.setFontSize(10);
  doc.text(`${t('exportDate')}: ${currentDateTime}`, 20, 30);
  let y = 40;

  const pageHeight = doc.internal.pageSize.getHeight();
  const contentBottom = pageHeight - 20;
  const maxTextWidth = 170;

  const ensurePdfSpace = (heightNeeded) => {
    if (y + heightNeeded > contentBottom) {
      doc.addPage();
      y = 20;
    }
  };

  const addPdfLine = (label, value) => {
    const text = `${label}: ${value || t('notAvailable')}`;
    const lines = doc.splitTextToSize(text, maxTextWidth);
    ensurePdfSpace(lines.length * 6);
    doc.text(lines, 20, y);
    y += lines.length * 6 + 4;
  };

  tasks.forEach(task => {
    doc.setFontSize(12);
    addPdfLine(t('title'), task.title);
    addPdfLine(t('tag'), task.tag);
    addPdfLine(t('priority'), priorityLabel(task.priority));
    addPdfLine(t('status'), statusLabel(taskStatus(task)));
    addPdfLine(t('description'), getRichTextPlainText(task.description));
    addPdfLine(t('comment'), task.comment);
    addPdfLine(t('attachment'), task.attachment_name);
    addPdfLine(t('completed'), task.completed ? t('yes') : t('no'));
    addPdfLine(t('dateTimeAlert'), task.reminder_at ? formatLocalDateTime(task.reminder_at) : '');
    addPdfLine(t('created'), formatDateEST(task.created_at));
    y += 5;
  });
  doc.save('tasks.pdf');
  showStatusToast(t('pdfExported'));
};

const exportToWord = async () => {
  const { Document, Packer, Paragraph, TextRun } = window.docx;
  const currentDateTime = new Date().toLocaleString('en-US', { 
    timeZone: 'America/New_York'
  }) + ' EST (NYC)';
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: t('myTasks'),
              bold: true,
              size: 32
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun(`${t('exportDate')}: ${currentDateTime}`)
          ]
        }),
        new Paragraph({
          children: [
            new TextRun('') // empty line
          ]
        }),
        ...tasks.flatMap(task => [
          new Paragraph({
            children: [
              new TextRun({
                text: `${t('title')}: ${task.title}`,
                bold: true
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun(`${t('description')}: ${getRichTextPlainText(task.description) || t('notAvailable')}`)
            ]
          }),
          new Paragraph({
            children: [
              new TextRun(`${t('comment')}: ${task.comment || t('notAvailable')}`)
            ]
          }),
          new Paragraph({
            children: [
              new TextRun(`${t('tag')}: ${task.tag || t('notAvailable')}`)
            ]
          }),
          new Paragraph({
            children: [
              new TextRun(`${t('priority')}: ${priorityLabel(task.priority)}`)
            ]
          }),
          new Paragraph({
            children: [
              new TextRun(`${t('status')}: ${statusLabel(taskStatus(task))}`)
            ]
          }),
          new Paragraph({
            children: [
              new TextRun(`${t('attachment')}: ${task.attachment_name || t('notAvailable')}`)
            ]
          }),
          new Paragraph({
            children: [
              new TextRun(`${t('completed')}: ${task.completed ? t('yes') : t('no')}`)
            ]
          }),
          new Paragraph({
            children: [
              new TextRun(`${t('dateTimeAlert')}: ${task.reminder_at ? formatLocalDateTime(task.reminder_at) : t('notAvailable')}`)
            ]
          }),
          new Paragraph({
            children: [
              new TextRun(`${t('created')}: ${formatDateEST(task.created_at)}`)
            ]
          }),
          new Paragraph({
            children: [
              new TextRun('') // empty line
            ]
          })
        ])
      ]
    }]
  });
  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tasks.docx';
  a.click();
  URL.revokeObjectURL(url);
  showStatusToast(t('wordExported'));
};

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

showLogin.addEventListener('click', () => setMode('login'));
showSignup.addEventListener('click', () => setMode('signup'));
languageSelect.addEventListener('change', (event) => {
  setLanguage(event.target.value);
  persistCurrentUserPreferences();
});
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
weatherForm.addEventListener('submit', handleWeatherSubmit);
weatherList.addEventListener('click', handleWeatherListClick);
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
editTaskForm.addEventListener('submit', handleEditTaskSubmit);
adminUserForm.addEventListener('submit', handleAdminUserSubmit);
openAddUserModalButton.addEventListener('click', () => showAdminUserModal());
if (impersonateUserSelect) {
  impersonateUserSelect.addEventListener('change', (event) => {
    if (event.target.value) startImpersonation(event.target.value);
  });
}
cancelAdminUser.addEventListener('click', hideAdminUserModal);
userSettingsForm?.addEventListener('submit', handleUserSettingsSubmit);
passwordSettingsForm?.addEventListener('submit', handlePasswordSettingsSubmit);
cancelUserSettings?.addEventListener('click', hideUserSettingsModal);
logoutButton.addEventListener('click', handleLogout);
sendSummaryEmailButton.addEventListener('click', sendSummaryEmail);
exportExcelButton.addEventListener('click', exportToExcel);
exportPdfButton.addEventListener('click', exportToPdf);
if (exportWordButton) exportWordButton.addEventListener('click', exportToWord);

setMode('login');
setupRichTextEditors();
languageSelect.value = currentLanguage;
applyTranslations();
registerServiceWorker();
init();
