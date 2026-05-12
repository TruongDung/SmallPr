const authSection = document.getElementById('auth-section');
const taskSection = document.getElementById('task-section');
const adminSection = document.getElementById('admin-section');
const userArea = document.getElementById('user-area');
const languageSelect = document.getElementById('language-select');
const authForm = document.getElementById('auth-form');
const taskForm = document.getElementById('task-form');
const adminUserForm = document.getElementById('admin-user-form');
const taskList = document.getElementById('task-list');
const userList = document.getElementById('user-list');
const authMessage = document.getElementById('auth-message');
const adminMessage = document.getElementById('admin-message');
const showLogin = document.getElementById('show-login');
const showSignup = document.getElementById('show-signup');
const logoutButton = document.getElementById('logout-button');
const sendSummaryEmailButton = document.getElementById('send-summary-email');
const exportExcelButton = document.getElementById('export-excel');
const exportPdfButton = document.getElementById('export-pdf');
const exportWordButton = document.getElementById('export-word');
const taskReminderInput = document.getElementById('task-reminder');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const deleteConfirmTitle = document.getElementById('delete-confirm-title');
const deleteConfirmMessage = document.getElementById('delete-confirm-message');
const confirmDeleteYes = document.getElementById('confirm-delete-yes');
const confirmDeleteNo = document.getElementById('confirm-delete-no');
const editTaskModal = document.getElementById('edit-task-modal');
const editTaskForm = document.getElementById('edit-task-form');
const editTaskTitle = document.getElementById('edit-task-title');
const editTaskTitleInput = document.getElementById('edit-task-title-input');
const editTaskDescriptionInput = document.getElementById('edit-task-description-input');
const editTaskReminderInput = document.getElementById('edit-task-reminder-input');
const editTitleError = document.getElementById('edit-title-error');
const editDescriptionError = document.getElementById('edit-description-error');
const editFormError = document.getElementById('edit-form-error');
const cancelEditTask = document.getElementById('cancel-edit-task');

let currentMode = 'login';
let currentUser = null;
let currentView = 'tasks';
let currentLanguage = localStorage.getItem('task-manager-language') || 'en';
let tasks = [];
let users = [];
const reminderTimers = new Map();
let weatherClockTimer = null;
let pendingDeleteTaskId = null;
let pendingDeleteUser = null;
let pendingEditTask = null;

const translations = {
  en: {
    appTitle: 'Task Manager',
    language: 'Language',
    login: 'Login',
    signup: 'Sign Up',
    username: 'Username',
    password: 'Password',
    submit: 'Submit',
    yourTasks: 'Your Tasks',
    sendEmail: 'Send Email',
    exportExcel: 'Export to Excel',
    exportPdf: 'Export to PDF',
    exportWord: 'Export to Word',
    logout: 'Logout',
    title: 'Title',
    max20: '(max 20 characters)',
    description: 'Description',
    max500: '(max 500 characters)',
    dateTimeAlert: 'Date Time Alert',
    addTask: 'Add Task',
    manageUsers: 'Manage Users',
    addUser: 'Add User',
    id: 'ID',
    tasks: 'Tasks',
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
    descriptionTooLong: 'Description must be 500 characters or less',
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
    edit: 'Edit',
    editTaskTitle: 'Edit task',
    save: 'Save',
    cancel: 'Cancel',
    deleteTaskTitle: 'Delete task?',
    deleteTaskMessage: 'This task will be permanently removed.',
    deleteUserTitle: 'Delete user?',
    deleteUserMessage: '{username} and all of their tasks will be permanently removed.',
    no: 'No',
    yes: 'Yes',
    taskTitlePrompt: 'Task title (max 20 characters)',
    titleEmpty: 'Title cannot be empty',
    taskDescriptionPrompt: 'Task description (max 500 characters)',
    reminderPrompt: 'Date time alert (YYYY-MM-DDTHH:mm, leave empty for no alert)',
    sending: 'Sending...',
    emailSent: 'Email sent.',
    taskReminderNow: 'Date time alert: {title} is happening now.',
    weatherUnavailable: 'Location weather is unavailable in this browser.',
    weatherUnable: 'Unable to load current city weather.',
    weatherPermission: 'Allow location access to show current city weather.',
    currentCity: 'Current City',
    humidity: 'Humidity',
    localTime: 'Local Time',
    exportDate: 'Export Date',
    myTasks: 'My Tasks',
    notAvailable: 'N/A',
  },
  vi: {
    appTitle: 'Quản lý công việc',
    language: 'Ngôn ngữ',
    login: 'Đăng nhập',
    signup: 'Đăng ký',
    username: 'Tên đăng nhập',
    password: 'Mật khẩu',
    submit: 'Gửi',
    yourTasks: 'Công việc của bạn',
    sendEmail: 'Gửi Email',
    exportExcel: 'Xuất Excel',
    exportPdf: 'Xuất PDF',
    exportWord: 'Xuất Word',
    logout: 'Đăng xuất',
    title: 'Tiêu đề',
    max20: '(tối đa 20 ký tự)',
    description: 'Mô tả',
    max500: '(tối đa 500 ký tự)',
    dateTimeAlert: 'Ngày giờ nhắc',
    addTask: 'Thêm công việc',
    manageUsers: 'Quản lý người dùng',
    addUser: 'Thêm người dùng',
    id: 'ID',
    tasks: 'Công việc',
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
    descriptionTooLong: 'Mô tả phải từ 500 ký tự trở xuống',
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
    edit: 'Sửa',
    editTaskTitle: 'Sửa công việc',
    save: 'Lưu',
    cancel: 'Hủy',
    deleteTaskTitle: 'Xóa công việc?',
    deleteTaskMessage: 'Công việc này sẽ bị xóa vĩnh viễn.',
    deleteUserTitle: 'Xóa người dùng?',
    deleteUserMessage: '{username} và tất cả công việc của người dùng này sẽ bị xóa vĩnh viễn.',
    no: 'Không',
    yes: 'Có',
    taskTitlePrompt: 'Tiêu đề công việc (tối đa 20 ký tự)',
    titleEmpty: 'Tiêu đề không được để trống',
    taskDescriptionPrompt: 'Mô tả công việc (tối đa 500 ký tự)',
    reminderPrompt: 'Ngày giờ nhắc (YYYY-MM-DDTHH:mm, để trống nếu không nhắc)',
    sending: 'Đang gửi...',
    emailSent: 'Đã gửi email.',
    taskReminderNow: 'Nhắc ngày giờ: {title} đang diễn ra.',
    weatherUnavailable: 'Trình duyệt này không hỗ trợ thời tiết theo vị trí.',
    weatherUnable: 'Không thể tải thời tiết thành phố hiện tại.',
    weatherPermission: 'Cho phép truy cập vị trí để hiển thị thời tiết thành phố hiện tại.',
    currentCity: 'Thành phố hiện tại',
    humidity: 'Độ ẩm',
    localTime: 'Giờ địa phương',
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

const applyTranslations = () => {
  document.documentElement.lang = currentLanguage;
  document.title = t('appTitle');
  setText('h1', t('appTitle'));
  setText('label[for="language-select"]', t('language'));
  showLogin.textContent = t('login');
  showSignup.textContent = t('signup');
  setText('label[for="username"]', t('username'));
  setText('label[for="password"]', t('password'));
  setText('#auth-form button[type="submit"]', t('submit'));
  setText('#task-section h2', t('yourTasks'));
  sendSummaryEmailButton.textContent = t('sendEmail');
  exportExcelButton.textContent = t('exportExcel');
  exportPdfButton.textContent = t('exportPdf');
  exportWordButton.textContent = t('exportWord');
  logoutButton.textContent = t('logout');
  setText('label[for="task-title"]', `${t('title')} ${t('max20')}`);
  setText('label[for="task-description"]', `${t('description')} ${t('max500')}`);
  setText('label[for="task-reminder"]', t('dateTimeAlert'));
  setText('#task-form button[type="submit"]', t('addTask'));
  editTaskTitle.textContent = t('editTaskTitle');
  setText('label[for="edit-task-title-input"]', `${t('title')} ${t('max20')}`);
  setText('label[for="edit-task-description-input"]', `${t('description')} ${t('max500')}`);
  setText('label[for="edit-task-reminder-input"]', t('dateTimeAlert'));
  cancelEditTask.textContent = t('cancel');
  setText('#save-edit-task', t('save'));
  setText('#admin-section h2', t('manageUsers'));
  setText('label[for="admin-username"]', t('username'));
  setText('label[for="admin-password"]', t('password'));
  setText('#admin-user-form button[type="submit"]', t('addUser'));
  setText('.user-table th:nth-child(1)', t('id'));
  setText('.user-table th:nth-child(2)', t('username'));
  setText('.user-table th:nth-child(3)', t('tasks'));
  setText('.user-table th:nth-child(4)', t('actions'));
  confirmDeleteNo.textContent = t('no');
  confirmDeleteYes.textContent = t('yes');
  if (currentUser) renderUserArea();
  if (currentUser && currentView === 'tasks') renderTasks(tasks);
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

const getReminderStorageKey = (task) => `task-reminder-alerted-${task.id}-${task.reminder_at}`;

const clearReminderTimers = () => {
  reminderTimers.forEach((timerId) => clearTimeout(timerId));
  reminderTimers.clear();
};

const showTaskReminder = (task) => {
  localStorage.setItem(getReminderStorageKey(task), 'true');
  alert(t('taskReminderNow', { title: task.title }));
};

const scheduleTaskReminders = (loadedTasks) => {
  clearReminderTimers();

  loadedTasks.forEach((task) => {
    if (!task.reminder_at || task.completed) return;
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

// Helper function to get weather icon
const getWeatherIcon = (weatherCode) => {
  if (weatherCode === 0 || weatherCode === 1) return '☀️'; // Clear/Mostly clear
  if (weatherCode === 2 || weatherCode === 3) return '⛅'; // Partly cloudy/Overcast
  if (weatherCode === 45 || weatherCode === 48) return '🌫️'; // Foggy
  if (weatherCode >= 51 && weatherCode <= 67) return '🌧️'; // Drizzle/Rain
  if (weatherCode >= 71 && weatherCode <= 77) return '❄️'; // Snow
  if (weatherCode === 80 || weatherCode === 81 || weatherCode === 82) return '🌧️'; // Showers
  if (weatherCode >= 85 && weatherCode <= 86) return '🌨️'; // Showers/Snow
  if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) return '⛈️'; // Thunderstorm
  return '🌤️';
};

// Fetch weather data
const fetchWeather = async () => {
  if (!navigator.geolocation) {
    showWeatherMessage(t('weatherUnavailable'));
    return;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        await fetchWeatherForLocation(latitude, longitude); 
      } catch (error) {
        console.error('Error fetching weather:', error);
        showWeatherMessage(t('weatherUnable'));
      } finally {
        resolve();
      }
    }, () => {
      showWeatherMessage(t('weatherPermission'));
      resolve();
    }, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 600000
    });
  });
};

// Fetch weather for a specific location
const fetchWeatherForLocation = async (lat, lng, locationName) => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,relative_humidity_2m&temperature_unit=fahrenheit&timezone=auto`
    );
    const data = await response.json();
    if (data.current) {
      displayWeather(data.current, lat, lng, locationName, data.timezone);
    }
  } catch (error) {
    console.error('Error fetching weather:', error);
    showWeatherMessage(t('weatherUnable'));
  }
};

// Display weather on the widget
const getCurrentTimeForTimezone = (timezone) => {
  return new Date().toLocaleString('en-US', {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  });
};

const showWeatherMessage = (message) => {
  const weatherWidget = document.getElementById('weather-widget');

  weatherWidget.innerHTML = `
    <div class="weather-content">
      <div class="weather-info">
        <div class="weather-location">${message}</div>
      </div>
    </div>
  `;
  weatherWidget.classList.remove('hidden');
};

const getCurrentCityName = async (lat, lng) => {
  try {
    const geoResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`
    );
    const geoData = await geoResponse.json();
    const address = geoData.address || {};

    return address.city
      || address.town
      || address.village
      || address.hamlet
      || address.municipality
      || address.county
      || t('currentCity');
  } catch {
    return t('currentCity');
  }
};

const displayWeather = async (weather, lat, lng, locationName = '', timezone = '') => {
  const weatherWidget = document.getElementById('weather-widget');
  
  // Get location name from coordinates if not provided
  const cityName = locationName || await getCurrentCityName(lat, lng);
  
  const icon = getWeatherIcon(weather.weather_code);
  const temp = Math.round(weather.temperature_2m);
  const humidity = weather.relative_humidity_2m;
  const currentTime = getCurrentTimeForTimezone(timezone);
  
  weatherWidget.innerHTML = `
    <div class="weather-content">
      <div class="weather-icon">${icon}</div>
      <div class="weather-info">
        <div class="weather-location">${cityName}</div>
        <div class="weather-temp">${temp}°F</div>
        <div class="weather-humidity">${t('humidity')}: ${humidity}%</div>
      </div>
      <div class="weather-time">
        <div class="time-label">${t('localTime')}</div>
        <div class="time-display">${currentTime}</div>
      </div>
    </div>
  `;
  weatherWidget.classList.remove('hidden');
  
  // Update time every second
  if (weatherClockTimer) {
    clearInterval(weatherClockTimer);
  }

  weatherClockTimer = setInterval(() => {
    const timeDisplay = weatherWidget.querySelector('.time-display');
    if (timeDisplay) {
      timeDisplay.textContent = getCurrentTimeForTimezone(timezone);
    }
  }, 1000);
};

const showSection = () => {
  if (!currentUser) {
    authSection.classList.remove('hidden');
    taskSection.classList.add('hidden');
    adminSection.classList.add('hidden');
    userArea.textContent = '';
    return;
  }

  authSection.classList.add('hidden');
  renderUserArea();

  const showAdmin = currentView === 'admin' && currentUser.username === 'admin';
  taskSection.classList.toggle('hidden', showAdmin);
  adminSection.classList.toggle('hidden', !showAdmin);

  if (showAdmin) {
    loadUsers();
    return;
  }

  loadTasks();
  fetchWeather(); // Load weather when showing task section
};

const renderUserArea = () => {
  userArea.innerHTML = '';
  const welcome = document.createElement('span');
  welcome.textContent = t('welcome', { username: currentUser.username });
  userArea.append(welcome);

  if (currentUser.username === 'admin') {
    const tasksButton = document.createElement('button');
    tasksButton.type = 'button';
    tasksButton.className = `secondary ${currentView === 'tasks' ? 'active-nav' : ''}`;
    tasksButton.textContent = t('tasks');
    tasksButton.addEventListener('click', () => {
      currentView = 'tasks';
      showSection();
    });

    const adminButton = document.createElement('button');
    adminButton.type = 'button';
    adminButton.className = `secondary ${currentView === 'admin' ? 'active-nav' : ''}`;
    adminButton.textContent = t('manageUsers');
    adminButton.addEventListener('click', () => {
      currentView = 'admin';
      showSection();
    });

    userArea.append(tasksButton, adminButton);
  }
};

const setMode = (mode) => {
  currentMode = mode;
  showLogin.classList.toggle('active', mode === 'login');
  showSignup.classList.toggle('active', mode === 'signup');
};

const setLanguage = (language) => {
  currentLanguage = language;
  localStorage.setItem('task-manager-language', language);
  languageSelect.value = language;
  applyTranslations();
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

    const taskCountCell = document.createElement('td');
    taskCountCell.textContent = user.task_count;

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'user-actions';

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'secondary';
    resetButton.textContent = t('resetPassword');
    resetButton.addEventListener('click', () => resetUserPassword(user));

    actions.append(resetButton);

    if (user.username !== 'admin' && user.id !== currentUser.id) {
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'danger';
      deleteButton.textContent = t('delete');
      deleteButton.addEventListener('click', () => showUserDeleteConfirm(user));
      actions.append(deleteButton);
    }

    actionsCell.append(actions);
    row.append(idCell, usernameCell, taskCountCell, actionsCell);
    userList.append(row);
  });
};

const handleAdminUserSubmit = async (event) => {
  event.preventDefault();
  adminMessage.textContent = '';

  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value.trim();

  const result = await request('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  if (result.error) {
    adminMessage.textContent = result.error;
    return;
  }

  adminUserForm.reset();
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
  const description = document.getElementById('task-description').value.trim();
  const reminder_at = taskReminderInput.value || null;
  
  const titleError = document.getElementById('title-error');
  const descriptionError = document.getElementById('description-error');
  const formError = document.getElementById('form-error');
  
  // Clear previous errors
  titleError.classList.add('hidden');
  descriptionError.classList.add('hidden');
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
  
  if (description.length > 500) {
    descriptionError.textContent = t('descriptionTooLong');
    descriptionError.classList.remove('hidden');
    return;
  }

  const result = await request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, description, reminder_at }),
  });

  if (result.task) {
    authForm.reset();
    taskForm.reset();
    titleError.classList.add('hidden');
    descriptionError.classList.add('hidden');
    formError.classList.add('hidden');
    loadTasks();
  }
};

const loadTasks = async () => {
  const result = await request('/api/tasks');
  if (result.tasks) {
    tasks = result.tasks;
    renderTasks(result.tasks);
    scheduleTaskReminders(result.tasks);
  }
};

const renderTasks = (tasks) => {
  taskList.innerHTML = '';

  if (tasks.length === 0) {
    taskList.innerHTML = `<p>${t('noTasks')}</p>`;
    return;
  }

  const tasksWithAlert = tasks.filter((task) => task.reminder_at);
  const tasksWithoutAlert = tasks.filter((task) => !task.reminder_at);

  const createColumn = (title, columnTasks) => {
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
    createColumn(t('recordsWithAlert'), tasksWithAlert),
    createColumn(t('alertNotSetColumn'), tasksWithoutAlert)
  );
};

const createTaskCard = (task) => {
    const card = document.createElement('div');
    card.className = `task-item ${task.completed ? 'completed' : ''}`;

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    const title = document.createElement('strong');
    title.textContent = task.title;
    const status = document.createElement('span');
    status.textContent = task.completed ? t('completed') : t('open');
    meta.append(title, status);

    const description = document.createElement('p');
    description.textContent = task.description || t('noDescription');

    const datetime = document.createElement('p');
    datetime.className = 'task-datetime';
    datetime.textContent = `📅 ${t('created')}: ${formatDateEST(task.created_at)}`;

    const reminder = document.createElement('p');
    reminder.className = 'task-reminder';
    reminder.textContent = task.reminder_at
      ? `${t('alert')}: ${formatLocalDateTime(task.reminder_at)}`
      : t('alertNotSet');

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const toggleButton = document.createElement('button');
    toggleButton.textContent = task.completed ? t('markOpen') : t('markDone');
    toggleButton.addEventListener('click', () => updateTask(task.id, { completed: !task.completed }));

    const editButton = document.createElement('button');
    editButton.textContent = t('edit');
    editButton.addEventListener('click', () => showEditTaskModal(task));

    const deleteButton = document.createElement('button');
    deleteButton.textContent = t('delete');
    deleteButton.className = 'danger';
    deleteButton.addEventListener('click', () => showDeleteConfirm(task.id));

    actions.append(toggleButton, editButton, deleteButton);
    card.append(meta, description, datetime, reminder, actions);
    return card;
};

const updateTask = async (id, updates) => {
  await request(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  loadTasks();
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
  deleteConfirmTitle.textContent = t('deleteTaskTitle');
  deleteConfirmMessage.textContent = t('deleteTaskMessage');
  deleteConfirmModal.classList.remove('hidden');
  confirmDeleteNo.focus();
};

const showUserDeleteConfirm = (user) => {
  pendingDeleteTaskId = null;
  pendingDeleteUser = user;
  deleteConfirmTitle.textContent = t('deleteUserTitle');
  deleteConfirmMessage.textContent = t('deleteUserMessage', { username: user.username });
  deleteConfirmModal.classList.remove('hidden');
  confirmDeleteNo.focus();
};

const hideDeleteConfirm = () => {
  pendingDeleteTaskId = null;
  pendingDeleteUser = null;
  deleteConfirmModal.classList.add('hidden');
};

confirmDeleteNo.addEventListener('click', hideDeleteConfirm);

confirmDeleteYes.addEventListener('click', async () => {
  if (!pendingDeleteTaskId && !pendingDeleteUser) return;
  const taskId = pendingDeleteTaskId;
  const user = pendingDeleteUser;
  hideDeleteConfirm();
  if (taskId) {
    await deleteTask(taskId);
    return;
  }
  await deleteUser(user);
});

deleteConfirmModal.addEventListener('click', (event) => {
  if (event.target === deleteConfirmModal) {
    hideDeleteConfirm();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !deleteConfirmModal.classList.contains('hidden')) {
    hideDeleteConfirm();
  }

  if (event.key === 'Escape' && !editTaskModal.classList.contains('hidden')) {
    hideEditTaskModal();
  }
});

const formatDateTimeLocalValue = (dateString) => {
  if (!dateString) return '';
  return dateString.slice(0, 16);
};

const clearEditTaskErrors = () => {
  editTitleError.classList.add('hidden');
  editDescriptionError.classList.add('hidden');
  editFormError.classList.add('hidden');
};

const showEditTaskModal = (task) => {
  pendingEditTask = task;
  clearEditTaskErrors();
  editTaskTitleInput.value = task.title;
  editTaskDescriptionInput.value = task.description || '';
  editTaskReminderInput.value = formatDateTimeLocalValue(task.reminder_at);
  editTaskModal.classList.remove('hidden');
  editTaskTitleInput.focus();
  editTaskTitleInput.select();
};

const hideEditTaskModal = () => {
  pendingEditTask = null;
  editTaskForm.reset();
  clearEditTaskErrors();
  editTaskModal.classList.add('hidden');
};

const handleEditTaskSubmit = async (event) => {
  event.preventDefault();
  if (!pendingEditTask) return;

  clearEditTaskErrors();

  const title = editTaskTitleInput.value.trim();
  const description = editTaskDescriptionInput.value.trim();
  const reminderAt = editTaskReminderInput.value || null;

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
  
  if (description.length > 500) {
    editDescriptionError.textContent = t('descriptionTooLong');
    editDescriptionError.classList.remove('hidden');
    return;
  }

  const task = pendingEditTask;
  hideEditTaskModal();
  await updateTask(task.id, {
    title,
    description,
    completed: task.completed,
    reminder_at: reminderAt
  });
};

cancelEditTask.addEventListener('click', hideEditTaskModal);

editTaskModal.addEventListener('click', (event) => {
  if (event.target === editTaskModal) {
    hideEditTaskModal();
  }
});

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
    });

    if (result.error) {
      alert(result.error);
      return;
    }

    alert(t('emailSent'));
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
    [t('description')]: task.description,
    [t('completed')]: task.completed ? t('yes') : t('no'),
    [t('dateTimeAlert')]: task.reminder_at ? formatLocalDateTime(task.reminder_at) : '',
    [t('created')]: formatDateEST(task.created_at),
    [t('updated')]: formatDateEST(task.updated_at)
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('tasks'));
  XLSX.writeFile(wb, 'tasks.xlsx');
};

const exportToPdf = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const currentDateTime = new Date().toLocaleString('en-US', { 
    timeZone: 'America/New_York'
  }) + ' EST (NYC)';
  
  doc.setFontSize(16);
  doc.text(t('myTasks'), 20, 20);
  doc.setFontSize(10);
  doc.text(`${t('exportDate')}: ${currentDateTime}`, 20, 30);
  let y = 40;
  tasks.forEach(task => {
    doc.setFontSize(12);
    doc.text(`${t('title')}: ${task.title}`, 20, y);
    y += 10;
    doc.text(`${t('description')}: ${task.description || t('notAvailable')}`, 20, y);
    y += 10;
    doc.text(`${t('completed')}: ${task.completed ? t('yes') : t('no')}`, 20, y);
    y += 10;
    doc.text(`${t('dateTimeAlert')}: ${task.reminder_at ? formatLocalDateTime(task.reminder_at) : t('notAvailable')}`, 20, y);
    y += 10;
    doc.text(`${t('created')}: ${formatDateEST(task.created_at)}`, 20, y);
    y += 15;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });
  doc.save('tasks.pdf');
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
              new TextRun(`${t('description')}: ${task.description || t('notAvailable')}`)
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
};

showLogin.addEventListener('click', () => setMode('login'));
showSignup.addEventListener('click', () => setMode('signup'));
languageSelect.addEventListener('change', (event) => setLanguage(event.target.value));
authForm.addEventListener('submit', handleAuthSubmit);
taskForm.addEventListener('submit', handleTaskSubmit);
editTaskForm.addEventListener('submit', handleEditTaskSubmit);
adminUserForm.addEventListener('submit', handleAdminUserSubmit);
logoutButton.addEventListener('click', handleLogout);
sendSummaryEmailButton.addEventListener('click', sendSummaryEmail);
exportExcelButton.addEventListener('click', exportToExcel);
exportPdfButton.addEventListener('click', exportToPdf);
exportWordButton.addEventListener('click', exportToWord);

setMode('login');
languageSelect.value = currentLanguage;
applyTranslations();
init();
