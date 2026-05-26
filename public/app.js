const authSection = document.getElementById('auth-section');
const taskSection = document.getElementById('task-section');
const adminSection = document.getElementById('admin-section');
const appContainer = document.querySelector('.container');
const userArea = document.getElementById('user-area');
const floatingAddTask = document.getElementById('floating-add-task');
const languageSelect = document.getElementById('language-select');
const themeToggle = document.getElementById('theme-toggle');
const authForm = document.getElementById('auth-form');
const addTaskModal = document.getElementById('add-task-modal');
const taskForm = document.getElementById('task-form');
const cancelAddTask = document.getElementById('cancel-add-task');
const saveAddTask = document.querySelector('#task-form button[type="submit"]');
const tagForm = document.getElementById('tag-form');
const tagManager = document.querySelector('.tag-manager');
const openAddUserModalButton = document.getElementById('open-add-user-modal');
const adminUserModal = document.getElementById('admin-user-modal');
const adminUserModalTitle = document.getElementById('admin-user-modal-title');
const adminUserForm = document.getElementById('admin-user-form');
const adminUsernameInput = document.getElementById('admin-username');
const adminEmailInput = document.getElementById('admin-email');
const adminPasswordField = document.getElementById('admin-password-field');
const adminPasswordInput = document.getElementById('admin-password');
const adminUserFormError = document.getElementById('admin-user-form-error');
const cancelAdminUser = document.getElementById('cancel-admin-user');
const saveAdminUser = document.getElementById('save-admin-user');
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
let currentView = 'tasks';
let currentLanguage = localStorage.getItem('task-manager-language') || 'en';
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
let pendingEditTag = null;
let pendingEditTask = null;
let pendingPreviewTask = null;
let statusToastTimer = null;
let reminderAlertPreviousFocus = null;
let preparedAttachment = null;
let preparedEditAttachment = null;
let removeEditAttachment = false;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const DEFAULT_TASK_PRIORITY = 'low';
const DAILY_QUOTE = 'Make it simple enough to begin.';

const translations = {
  en: {
    appTitle: 'Task Manager',
    appSubtitle: 'Plan, tag, and track your work',
    language: 'Language',
    darkMode: 'Dark',
    lightMode: 'Light',
    switchToDarkMode: 'Switch to dark mode',
    switchToLightMode: 'Switch to light mode',
    login: 'Login',
    signup: 'Sign Up',
    username: 'Username',
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
    max500: '(max 5000 characters)',
    dateTimeAlert: 'Date Time Alert',
    uploadFile: 'Upload File',
    addTask: 'Add Task',
    manageUsers: 'User',
    addUser: 'Add User',
    editUser: 'Edit User',
    userUpdated: 'User updated.',
    id: 'ID',
    tasks: 'Tasks',
    archive: 'Archive',
    archived: 'Archived',
    restore: 'Restore',
    addTaskShortcut: 'Add task',
    noArchivedTasks: 'No archived tasks.',
    actions: 'Actions',
    welcome: 'Welcome, {username}',
    authRequired: 'Username and password are required.',
    resetPassword: 'Reset Password',
    delete: 'Delete',
    newPasswordFor: 'New password for {username}',
    passwordRequired: 'Password is required',
    passwordUpdated: 'Password updated.',
    titleRequired: 'Title is required',
    titleTooLong: 'Title must be 20 characters or less',
    descriptionTooLong: 'Description must be 5000 characters or less',
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
    taskTitlePrompt: 'Task title (max 20 characters)',
    titleEmpty: 'Title cannot be empty',
    taskDescriptionPrompt: 'Task description (max 5000 characters)',
    reminderPrompt: 'Date time alert (YYYY-MM-DDTHH:mm, leave empty for no alert)',
    sending: 'Sending...',
    emailSent: 'Email sent.',
    excelExported: 'Excel exported.',
    pdfExported: 'PDF exported.',
    wordExported: 'Word exported.',
    reminderTitle: 'Reminder',
    taskReminderNow: 'Date time alert: {title} is happening now.',
    dailyQuote: 'Daily Quote',
    exportDate: 'Export Date',
    myTasks: 'My Tasks',
    notAvailable: 'N/A',
  },
  vi: {
    priority: 'Uu tien',
    low: 'Thap',
    medium: 'Trung binh',
    high: 'Cao',
    status: 'Trang thai',
    tag: 'Nhãn',
    tagPlaceholder: 'Công việc, cá nhân, khẩn...',
    manageTags: 'Quản lý nhãn',
    tagName: 'Tên nhãn',
    addTag: 'Thêm nhãn',
    noTags: 'Chưa có nhãn.',
    tasksForTag: 'Công việc có nhãn "{tag}"',
    clearTagFilter: 'Xóa bộ lọc',
    noTaggedTasks: 'Không có công việc nào khớp với nhãn này.',
    tagRequired: 'Vui lòng nhập tên nhãn',
    tagTooLong: 'Tên nhãn phải từ 40 ký tự trở xuống',
    tagAdded: 'Đã thêm nhãn.',
    tagUpdated: 'Đã cập nhật nhãn.',
    tagDeleted: 'Đã xóa nhãn.',
    renameTag: 'Đổi tên nhãn',
    todo: 'Cần làm',
    in_progress: 'Đang làm',
    done: 'Hoàn thành',
    appTitle: 'Quản lý công việc',
    appSubtitle: 'Sắp xếp, gắn nhãn và theo dõi công việc',
    language: 'Ngôn ngữ',
    darkMode: 'Tối',
    lightMode: 'Sáng',
    switchToDarkMode: 'Chuyển sang chế độ tối',
    switchToLightMode: 'Chuyển sang chế độ sáng',
    login: 'Đăng nhập',
    signup: 'Đăng ký',
    username: 'Tên đăng nhập',
    email: 'Email',
    password: 'Mật khẩu',
    showPassword: 'Hiện mật khẩu',
    hidePassword: 'Ẩn mật khẩu',
    submit: 'Gửi',
    yourTasks: 'Công việc của bạn',
    sendEmail: 'Gửi Email',
    exportExcel: 'Xuất Excel',
    exportPdf: 'Xuất PDF',
    exportWord: 'Xuất Word',
    logout: 'Đăng xuất',
    searchTasks: 'Tìm công việc',
    searchTasksPlaceholder: 'Tìm tiêu đề, mô tả, bình luận',
    clearSearch: 'Xóa tìm kiếm',
    noSearchTasks: 'Không có công việc phù hợp.',
    title: 'Tiêu đề',
    max20: '(tối đa 20 ký tự)',
    description: 'Mô tả',
    descriptionPlaceholder: 'Nhập ghi chú, danh sách và chi tiết tại đây...',
    addComment: 'Thêm bình luận',
    comment: 'Bình luận',
    commentPlaceholder: 'Thêm bình luận về công việc này...',
    max500: '(tối đa 5000 ký tự)',
    dateTimeAlert: 'Ngày giờ nhắc',
    uploadFile: 'Tải tệp lên',
    addTask: 'Thêm công việc',
    manageUsers: 'Người dùng',
    addUser: 'Thêm người dùng',
    editUser: 'Sửa người dùng',
    userUpdated: 'Đã cập nhật người dùng.',
    id: 'ID',
    tasks: 'Công việc',
    archive: 'Luu tru',
    archived: 'Da luu tru',
    restore: 'Khoi phuc',
    addTaskShortcut: 'Them cong viec',
    noArchivedTasks: 'Khong co cong viec da luu tru.',
    actions: 'Thao tác',
    welcome: 'Xin chào, {username}',
    authRequired: 'Vui lòng nhập tên đăng nhập và mật khẩu.',
    resetPassword: 'Đặt lại mật khẩu',
    delete: 'Xóa',
    newPasswordFor: 'Mật khẩu mới cho {username}',
    passwordRequired: 'Vui lòng nhập mật khẩu',
    passwordUpdated: 'Đã cập nhật mật khẩu.',
    titleRequired: 'Vui lòng nhập tiêu đề',
    titleTooLong: 'Tiêu đề phải từ 20 ký tự trở xuống',
    descriptionTooLong: 'Mô tả phải từ 5000 ký tự trở xuống',
    attachmentTooLarge: 'Tệp phải từ 5 MB trở xuống',
    attachmentNotReady: 'Vui lòng chờ tệp tải lên hoàn tất',
    attachment: 'Tệp đính kèm',
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
    alert: 'Nhắc',
    alertNotSet: 'Nhắc: Chưa đặt',
    markOpen: 'Mở lại',
    markDone: 'Đánh dấu xong',
    preview: 'Xem',
    previewTaskTitle: 'Xem',
    close: 'Đóng',
    edit: 'Sửa',
    editTaskTitle: 'Sửa công việc',
    save: 'Lưu',
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
    taskTitlePrompt: 'Tiêu đề công việc (tối đa 20 ký tự)',
    titleEmpty: 'Tiêu đề không được để trống',
    taskDescriptionPrompt: 'Mô tả công việc (tối đa 5000 ký tự)',
    reminderPrompt: 'Ngày giờ nhắc (YYYY-MM-DDTHH:mm, để trống nếu không nhắc)',
    sending: 'Đang gửi...',
    emailSent: 'Đã gửi email.',
    excelExported: 'Đã xuất Excel.',
    pdfExported: 'Đã xuất PDF.',
    wordExported: 'Đã xuất Word.',
    taskReminderNow: 'Nhắc ngày giờ: {title} đang diễn ra.',
    dailyQuote: 'Cau noi hom nay',
    exportDate: 'Ngày xuất',
    myTasks: 'Công việc của tôi',
    notAvailable: 'Không có',
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
  setText('label[for="username"]', t('username'));
  setText('label[for="password"]', t('password'));
  togglePasswordButton.setAttribute(
    'aria-label',
    passwordInput.type === 'password' ? t('showPassword') : t('hidePassword')
  );
  setText('#auth-form button[type="submit"]', t('submit'));
  setIconButtonLabel(sendSummaryEmailButton, t('sendEmail'));
  setIconButtonLabel(exportExcelButton, t('exportExcel'));
  setIconButtonLabel(exportPdfButton, t('exportPdf'));
  setIconButtonLabel(exportWordButton, t('exportWord'));
  logoutButton.textContent = t('logout');
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
  setText('label[for="tag-name"]', t('tagName'));
  document.getElementById('tag-name').placeholder = t('tagPlaceholder');
  setText('#tag-form button[type="submit"]', t('addTag'));
  editTagTitle.textContent = t('renameTag');
  setText('label[for="edit-tag-name-input"]', t('tagName'));
  editTagNameInput.placeholder = t('tagPlaceholder');
  cancelEditTag.textContent = t('cancel');
  setText('#save-edit-tag', t('save'));
  setText('label[for="task-description"]', `${t('description')} ${t('max500')}`);
  document.getElementById('task-description').setAttribute('data-placeholder', t('descriptionPlaceholder'));
  setText('label[for="task-reminder"]', t('dateTimeAlert'));
  setText('label[for="task-attachment"]', t('uploadFile'));
  setText('#add-task-title', t('addTask'));
  setActionIconButton(cancelAddTask, t('cancel'), '×');
  setActionIconButton(saveAddTask, t('addTask'), '✓');
  editTaskTitle.textContent = t('editTaskTitle');
  previewTaskTitle.textContent = t('previewTaskTitle');
  setText('label[for="preview-task-comment-input"]', t('comment'));
  previewTaskCommentInput.placeholder = t('commentPlaceholder');
  setActionIconButton(sendPreviewTaskEmail, t('sendEmail'), '✉');
  setActionIconButton(editPreviewTask, t('edit'), '✎');
  setActionIconButton(savePreviewComment, t('save'), '✓');
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
  editTaskCommentInput.placeholder = t('commentPlaceholder');
  setText('label[for="edit-task-reminder-input"]', t('dateTimeAlert'));
  setText('label[for="edit-task-attachment-input"]', t('uploadFile'));
  renderEditAttachmentState();
  cancelEditTask.textContent = t('cancel');
  setText('#save-edit-task', t('save'));
  setText('#admin-section h2', t('manageUsers'));
  setText('#open-add-user-modal', t('addUser'));
  adminUserModalTitle.textContent = pendingAdminUser ? t('editUser') : t('addUser');
  setText('label[for="admin-username"]', t('username'));
  setText('label[for="admin-email"]', t('email'));
  setText('label[for="admin-password"]', t('password'));
  cancelAdminUser.textContent = t('cancel');
  saveAdminUser.textContent = pendingAdminUser ? t('save') : t('addUser');
  setText('.user-table th:nth-child(1)', t('id'));
  setText('.user-table th:nth-child(2)', t('username'));
  setText('.user-table th:nth-child(3)', t('email'));
  setText('.user-table th:nth-child(4)', t('tasks'));
  setText('.user-table th:nth-child(5)', t('actions'));
  confirmDeleteNo.textContent = t('no');
  confirmDeleteYes.textContent = t('yes');
  if (currentUser) renderUserArea();
  if (currentUser) renderTags(tags);
  if (currentUser && (currentView === 'tasks' || currentView === 'archived')) renderTasks(tasks);
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

const richTextAllowedTags = new Set(['A', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL', 'UL', 'OL', 'LI', 'P', 'DIV', 'BR']);

const hasRichTextMarkup = (value = '') => /<\/?(a|b|strong|i|em|u|s|strike|del|ul|ol|li|p|div|br)\b/i.test(value);

const isSafeLinkHref = (href = '') => /^(https?:|mailto:)/i.test(href);

const autolinkPlainUrls = (html = '') => html.replace(
  /(^|[\s>])((https?:\/\/)[^\s<]+)/gi,
  (match, prefix, url) => `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
);

const linkifyPlainText = (value = '') => autolinkPlainUrls(escapeHtml(value)).replace(/\n/g, '<br>');

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
  });

  return template.innerHTML.trim();
};

const getRichTextPlainText = (html = '') => {
  const container = document.createElement('div');
  container.innerHTML = sanitizeRichText(html);
  return container.textContent.trim();
};

const taskMatchesSearch = (task, query) => {
  if (!query) return true;
  const haystack = [
    task.title,
    getRichTextPlainText(task.description || ''),
    task.comment,
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
      document.execCommand(button.dataset.command, false, null);
      saveRichEditorSelection(editor);
    });
  });

  document.querySelectorAll('.rich-editor-surface').forEach((editor) => {
    editor.addEventListener('keyup', () => saveRichEditorSelection(editor));
    editor.addEventListener('mouseup', () => saveRichEditorSelection(editor));
    editor.addEventListener('input', () => saveRichEditorSelection(editor));

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
  quoteWidget.innerHTML = getDailyQuoteCard();
  quoteWidget.classList.remove('hidden');
};

const getDailyQuoteCard = () => `
  <section class="daily-quote" aria-label="${escapeHtml(t('dailyQuote'))}">
    <div class="daily-quote-label">${escapeHtml(t('dailyQuote'))}</div>
    <p>${escapeHtml(DAILY_QUOTE)}</p>
  </section>
`;

const showSection = () => {
  if (!currentUser) {
    authSection.classList.remove('hidden');
    taskSection.classList.add('hidden');
    adminSection.classList.add('hidden');
    floatingAddTask.classList.add('hidden');
    userArea.textContent = '';
    return;
  }

  authSection.classList.add('hidden');
  renderUserArea();

  const showAdmin = currentView === 'admin' && currentUser.username === 'admin';
  taskSection.classList.toggle('hidden', showAdmin);
  adminSection.classList.toggle('hidden', !showAdmin);
  floatingAddTask.classList.toggle('hidden', showAdmin);

  if (showAdmin) {
    loadUsers();
    return;
  }

  taskForm.classList.toggle('hidden', currentView === 'archived');
  tagManager.classList.toggle('hidden', currentView === 'archived');
  loadTags();
  loadTasks();
  renderQuoteWidget();
};

const showAddTaskModal = () => {
  taskPriorityInput.value = DEFAULT_TASK_PRIORITY;
  addTaskModal.classList.remove('hidden');
  document.getElementById('task-title').focus();
};

const openAddTaskFlow = () => {
  currentView = 'tasks';
  showSection();
  showAddTaskModal();
};

const hideAddTaskModal = () => {
  addTaskModal.classList.add('hidden');
};

const renderUserArea = () => {
  userArea.innerHTML = '';
  const welcome = document.createElement('span');
  welcome.textContent = t('welcome', { username: currentUser.username });
  userArea.append(welcome);
  logoutButton.className = 'secondary';

  const tasksButton = document.createElement('button');
  tasksButton.type = 'button';
  tasksButton.className = `secondary ${currentView === 'tasks' ? 'active-nav' : ''}`;
  tasksButton.textContent = t('tasks');
  tasksButton.addEventListener('click', () => {
    currentView = 'tasks';
    showSection();
  });

  const archivedButton = document.createElement('button');
  archivedButton.type = 'button';
  archivedButton.className = `secondary ${currentView === 'archived' ? 'active-nav' : ''}`;
  archivedButton.textContent = t('archived');
  archivedButton.addEventListener('click', () => {
    currentView = 'archived';
    showSection();
  });

  const tagButton = document.createElement('button');
  tagButton.type = 'button';
  tagButton.className = 'secondary';
  tagButton.textContent = t('tag');
  tagButton.addEventListener('click', () => {
    currentView = 'tasks';
    showSection();
    tagManager.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('tag-name').focus();
  });

  const addTaskButton = document.createElement('button');
  addTaskButton.type = 'button';
  addTaskButton.className = 'secondary add-task-shortcut';
  addTaskButton.textContent = '+';
  addTaskButton.setAttribute('aria-label', t('addTaskShortcut'));
  addTaskButton.title = t('addTaskShortcut');
  addTaskButton.addEventListener('click', openAddTaskFlow);

  userArea.append(addTaskButton, tasksButton, archivedButton, tagButton);

  if (currentUser.username === 'admin') {
    const adminButton = document.createElement('button');
    adminButton.type = 'button';
    adminButton.className = `secondary ${currentView === 'admin' ? 'active-nav' : ''}`;
    adminButton.textContent = t('manageUsers');
    adminButton.addEventListener('click', () => {
      currentView = 'admin';
      showSection();
    });

    userArea.append(adminButton);
  }

  userArea.append(logoutButton);
};

const setMode = (mode) => {
  currentMode = mode;
  showLogin.classList.toggle('active', mode === 'login');
  showSignup.classList.toggle('active', mode === 'signup');
  passwordInput.setAttribute('autocomplete', mode === 'login' ? 'current-password' : 'new-password');
};

const setLanguage = (language) => {
  currentLanguage = language;
  localStorage.setItem('task-manager-language', language);
  languageSelect.value = language;
  applyTranslations();
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
  return response.json();
};

const init = async () => {
  const result = await request('/api/me');
  currentUser = result.user;
  showSection();
};

const handleAuthSubmit = async (event) => {
  event.preventDefault();
  authMessage.textContent = '';

  const username = authForm.username.value.trim();
  const password = authForm.password.value.trim();

  if (!username || !password) {
    authMessage.textContent = t('authRequired');
    return;
  }

  const endpoint = currentMode === 'login' ? '/api/login' : '/api/signup';
  const result = await request(endpoint, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  if (result.error) {
    authMessage.textContent = result.error;
    return;
  }

  currentUser = result.user;
  currentView = 'tasks';
  authForm.reset();
  showSection();
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
      currentView = 'tasks';
      renderUserArea();
      taskForm.classList.remove('hidden');
      tagManager.classList.remove('hidden');
      renderTags(tags);
      renderTasks(tasks);
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
  renderUsers(users);
};

const renderUsers = (users) => {
  userList.innerHTML = '';

  users.forEach((user) => {
    const row = document.createElement('tr');

    const idCell = document.createElement('td');
    idCell.textContent = user.id;

    const usernameCell = document.createElement('td');
    usernameCell.textContent = user.username;

    const emailCell = document.createElement('td');
    emailCell.textContent = user.email || '';

    const taskCountCell = document.createElement('td');
    taskCountCell.textContent = user.task_count;

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'user-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'secondary';
    editButton.textContent = t('edit');
    editButton.addEventListener('click', () => showAdminUserModal(user));

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'secondary';
    resetButton.textContent = t('resetPassword');
    resetButton.addEventListener('click', () => resetUserPassword(user));

    actions.append(editButton, resetButton);

    if (user.username !== 'admin' && user.id !== currentUser.id) {
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'danger';
      deleteButton.textContent = t('delete');
      deleteButton.addEventListener('click', () => showUserDeleteConfirm(user));
      actions.append(deleteButton);
    }

    actionsCell.append(actions);
    row.append(idCell, usernameCell, emailCell, taskCountCell, actionsCell);
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
  saveAdminUser.textContent = user ? t('save') : t('addUser');
  adminPasswordField.classList.toggle('hidden', Boolean(user));
  adminPasswordInput.required = !user;

  if (user) {
    adminUsernameInput.value = user.username || '';
    adminEmailInput.value = user.email || '';
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
  clearAdminUserFormError();
  adminUserModal.classList.add('hidden');
};

const handleAdminUserSubmit = async (event) => {
  event.preventDefault();
  adminMessage.textContent = '';
  clearAdminUserFormError();

  const username = adminUsernameInput.value.trim();
  const email = adminEmailInput.value.trim();
  const password = adminPasswordInput.value.trim();
  const isEditing = Boolean(pendingAdminUser);

  if (!username || (!isEditing && !password)) {
    adminUserFormError.textContent = t('authRequired');
    adminUserFormError.classList.remove('hidden');
    return;
  }

  const result = await request(isEditing ? `/api/admin/users/${pendingAdminUser.id}` : '/api/admin/users', {
    method: isEditing ? 'PUT' : 'POST',
    body: JSON.stringify(isEditing ? { username, email } : { username, email, password }),
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
  
  if (getRichEditorLength(descriptionEditor) > 5000) {
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

  try {
    const result = await request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, tag, description, priority, status, reminder_at, attachment: preparedAttachment, language: currentLanguage }),
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
      titleError.classList.add('hidden');
      descriptionError.classList.add('hidden');
      attachmentError.classList.add('hidden');
      formError.classList.add('hidden');
      hideAddTaskModal();
      loadTags();
      loadTasks();
    }
  } catch (error) {
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
    column.className = 'task-column';

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
      description.innerHTML = sanitizeRichText(task.description);
      openRichTextLinksWithModifier(description);
    } else {
      description.textContent = t('noDescription');
    }

    const comment = document.createElement('p');
    comment.className = 'task-comment';
    const commentText = `${t('comment')}: ${task.comment}`;
    comment.innerHTML = linkifyPlainText(commentText);
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
  deleteConfirmTitle.textContent = t('deleteTaskTitle');
  deleteConfirmMessage.textContent = t('deleteTaskMessage');
  deleteConfirmModal.classList.remove('hidden');
  confirmDeleteNo.focus();
};

const showUserDeleteConfirm = (user) => {
  pendingDeleteTaskId = null;
  pendingDeleteUser = user;
  pendingDeleteTag = null;
  deleteConfirmTitle.textContent = t('deleteUserTitle');
  deleteConfirmMessage.textContent = t('deleteUserMessage', { username: user.username });
  deleteConfirmModal.classList.remove('hidden');
  confirmDeleteNo.focus();
};

const showTagDeleteConfirm = (tag) => {
  pendingDeleteTaskId = null;
  pendingDeleteUser = null;
  pendingDeleteTag = tag;
  deleteConfirmTitle.textContent = t('deleteTagTitle');
  deleteConfirmMessage.textContent = t('deleteTagMessage', { tag: tag.name });
  deleteConfirmModal.classList.remove('hidden');
  confirmDeleteNo.focus();
};

const hideDeleteConfirm = () => {
  pendingDeleteTaskId = null;
  pendingDeleteUser = null;
  pendingDeleteTag = null;
  deleteConfirmModal.classList.add('hidden');
};

confirmDeleteNo.addEventListener('click', hideDeleteConfirm);

confirmDeleteYes.addEventListener('click', async () => {
  if (!pendingDeleteTaskId && !pendingDeleteUser && !pendingDeleteTag) return;
  const taskId = pendingDeleteTaskId;
  const user = pendingDeleteUser;
  const tag = pendingDeleteTag;
  hideDeleteConfirm();
  if (taskId) {
    await deleteTask(taskId);
    return;
  }
  if (tag) {
    await deleteTag(tag);
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

addTaskModal.addEventListener('click', (event) => {
  if (event.target === addTaskModal) {
    hideAddTaskModal();
  }
});

editTagModal.addEventListener('click', (event) => {
  if (event.target === editTagModal) {
    hideEditTagModal();
  }
});

adminUserModal.addEventListener('click', (event) => {
  if (event.target === adminUserModal) {
    hideAdminUserModal();
  }
});

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
  editTaskCommentInput.value = task.comment || '';
  editTaskReminderInput.value = formatDateTimeLocalValue(task.reminder_at);
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
  editTaskCommentInput.value = '';
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
  const comment = editTaskCommentInput.value.trim();
  const reminderAt = editTaskReminderInput.value || null;
  const attachmentFile = editTaskAttachmentInput.files[0] || null;

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
  
  if (getRichEditorLength(editTaskDescriptionInput) > 5000) {
    editDescriptionError.textContent = t('descriptionTooLong');
    editDescriptionError.classList.remove('hidden');
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

  const task = pendingEditTask;
  const updates = {
    title,
    tag,
    priority,
    status,
    description,
    comment,
    reminder_at: reminderAt
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

editTaskModal.addEventListener('click', (event) => {
  if (event.target === editTaskModal) {
    hideEditTaskModal();
  }
});

const showPreviewTaskModal = (task) => {
  pendingPreviewTask = task;
  previewTaskDescription.innerHTML = task.description
    ? sanitizeRichText(task.description)
    : t('noDescription');
  openRichTextLinksWithModifier(previewTaskDescription);
  previewTaskCommentInput.value = task.comment || '';
  previewTaskCommentInput.readOnly = true;
  previewTaskCommentDisplay.innerHTML = task.comment ? linkifyPlainText(task.comment) : t('noComment');
  previewTaskCommentDisplay.classList.remove('hidden');
  previewTaskCommentInput.classList.add('hidden');
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
  previewTaskCommentInput.classList.remove('hidden');
  previewTaskCommentInput.value = '';
  previewTaskCommentInput.readOnly = false;
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

savePreviewComment.addEventListener('click', async () => {
  if (!pendingPreviewTask) return;
  const task = pendingPreviewTask;
  const comment = previewTaskCommentInput.value.trim();
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

const showStatusToast = (message, tone = 'success') => {
  if (statusToastTimer) {
    clearTimeout(statusToastTimer);
  }

  statusToast.textContent = message;
  statusToast.classList.toggle('status-toast-error', tone === 'error');
  statusToast.classList.remove('hidden');
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
  currentUser = null;
  currentView = 'tasks';
  showSection();
};

const sendSummaryEmail = async () => {
  const originalText = sendSummaryEmailButton.textContent;
  sendSummaryEmailButton.disabled = true;
  sendSummaryEmailButton.textContent = t('sending');

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
  } finally {
    sendSummaryEmailButton.disabled = false;
    sendSummaryEmailButton.textContent = originalText;
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

showLogin.addEventListener('click', () => setMode('login'));
showSignup.addEventListener('click', () => setMode('signup'));
languageSelect.addEventListener('change', (event) => setLanguage(event.target.value));
themeToggle.addEventListener('click', toggleTheme);
togglePasswordButton.addEventListener('click', togglePasswordVisibility);
floatingAddTask.addEventListener('click', openAddTaskFlow);
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
authForm.addEventListener('submit', handleAuthSubmit);
taskForm.addEventListener('submit', handleTaskSubmit);
tagForm.addEventListener('submit', handleTagSubmit);
editTaskForm.addEventListener('submit', handleEditTaskSubmit);
adminUserForm.addEventListener('submit', handleAdminUserSubmit);
openAddUserModalButton.addEventListener('click', () => showAdminUserModal());
cancelAdminUser.addEventListener('click', hideAdminUserModal);
logoutButton.addEventListener('click', handleLogout);
sendSummaryEmailButton.addEventListener('click', sendSummaryEmail);
exportExcelButton.addEventListener('click', exportToExcel);
exportPdfButton.addEventListener('click', exportToPdf);
exportWordButton.addEventListener('click', exportToWord);

setMode('login');
setupRichTextEditors();
languageSelect.value = currentLanguage;
applyTranslations();
registerServiceWorker();
init();
