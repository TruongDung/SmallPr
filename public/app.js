const authSection = document.getElementById('auth-section');
const taskSection = document.getElementById('task-section');
const userArea = document.getElementById('user-area');
const authForm = document.getElementById('auth-form');
const taskForm = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const authMessage = document.getElementById('auth-message');
const showLogin = document.getElementById('show-login');
const showSignup = document.getElementById('show-signup');
const logoutButton = document.getElementById('logout-button');
const exportExcelButton = document.getElementById('export-excel');
const exportPdfButton = document.getElementById('export-pdf');
const exportWordButton = document.getElementById('export-word');

let currentMode = 'login';
let currentUser = null;
let tasks = [];

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
  try {
    // Get user's geolocation
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Fetch weather from Open-Meteo API (free, no API key needed)
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,relative_humidity_2m&temperature_unit=fahrenheit&timezone=America/New_York`
          );
          const data = await response.json();
          
          if (data.current) {
            const weather = data.current;
            displayWeather(weather, latitude, longitude);
          }
          resolve();
        }, () => {
          // Fallback to New York City if geolocation fails
          console.log('Geolocation failed, using NYC as default');
          fetchWeatherForLocation(40.7128, -74.0060, 'New York City');
          resolve();
        });
      } else {
        console.log('Geolocation not supported');
        resolve();
      }
    });
  } catch (error) {
    console.error('Error fetching weather:', error);
  }
};

// Fetch weather for a specific location
const fetchWeatherForLocation = async (lat, lng, locationName) => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,relative_humidity_2m&temperature_unit=fahrenheit&timezone=America/New_York`
    );
    const data = await response.json();
    if (data.current) {
      displayWeather(data.current, lat, lng, locationName);
    }
  } catch (error) {
    console.error('Error fetching weather:', error);
  }
};

// Display weather on the widget
// Get current time in EST timezone
const getCurrentTimeEST = () => {
  const now = new Date();
  return now.toLocaleString('en-US', { timeZone: 'America/New_York' });
};

const displayWeather = async (weather, lat, lng, locationName = '') => {
  const weatherWidget = document.getElementById('weather-widget');
  
  // Get location name from coordinates if not provided
  let cityName = locationName;
  if (!cityName) {
    try {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const geoData = await geoResponse.json();
      cityName = geoData.address.city || geoData.address.county || 'Current Location';
    } catch {
      cityName = 'Current Location';
    }
  }
  
  const icon = getWeatherIcon(weather.weather_code);
  const temp = Math.round(weather.temperature_2m);
  const humidity = weather.relative_humidity_2m;
  const currentTime = getCurrentTimeEST();
  
  weatherWidget.innerHTML = `
    <div class="weather-content">
      <div class="weather-icon">${icon}</div>
      <div class="weather-info">
        <div class="weather-location">${cityName}</div>
        <div class="weather-temp">${temp}°F</div>
        <div class="weather-humidity">Humidity: ${humidity}%</div>
      </div>
      <div class="weather-time">
        <div class="time-label">EST Time</div>
        <div class="time-display">${currentTime}</div>
      </div>
    </div>
  `;
  weatherWidget.classList.remove('hidden');
  
  // Update time every second
  setInterval(() => {
    const timeDisplay = weatherWidget.querySelector('.time-display');
    if (timeDisplay) {
      timeDisplay.textContent = getCurrentTimeEST();
    }
  }, 1000);
};

const showSection = () => {
  if (!currentUser) {
    authSection.classList.remove('hidden');
    taskSection.classList.add('hidden');
    userArea.textContent = '';
    return;
  }

  authSection.classList.add('hidden');
  taskSection.classList.remove('hidden');
  userArea.textContent = `Welcome, ${currentUser.username}`;
  loadTasks();
  fetchWeather(); // Load weather when showing task section
};

const setMode = (mode) => {
  currentMode = mode;
  showLogin.classList.toggle('active', mode === 'login');
  showSignup.classList.toggle('active', mode === 'signup');
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
    authMessage.textContent = 'Username and password are required.';
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
  authForm.reset();
  showSection();
};

const handleTaskSubmit = async (event) => {
  event.preventDefault();
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const time_spent_minutes = parseInt(document.getElementById('task-time').value) || 0;
  
  const titleError = document.getElementById('title-error');
  const descriptionError = document.getElementById('description-error');
  const formError = document.getElementById('form-error');
  
  // Clear previous errors
  titleError.classList.add('hidden');
  descriptionError.classList.add('hidden');
  formError.classList.add('hidden');

  // Validation
  if (!title) {
    formError.textContent = 'Title is required';
    formError.classList.remove('hidden');
    return;
  }
  
  if (title.length > 20) {
    titleError.textContent = 'Title must be 20 characters or less';
    titleError.classList.remove('hidden');
    return;
  }
  
  if (description.length > 500) {
    descriptionError.textContent = 'Description must be 500 characters or less';
    descriptionError.classList.remove('hidden');
    return;
  }

  const result = await request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, description, time_spent_minutes }),
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
  }
};

const renderTasks = (tasks) => {
  taskList.innerHTML = '';

  if (tasks.length === 0) {
    taskList.innerHTML = '<p>No tasks yet. Add your first task!</p>';
    return;
  }

  tasks.forEach((task) => {
    const card = document.createElement('div');
    card.className = `task-item ${task.completed ? 'completed' : ''}`;

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    const title = document.createElement('strong');
    title.textContent = task.title;
    const status = document.createElement('span');
    status.textContent = task.completed ? 'Completed' : 'Open';
    meta.append(title, status);

    const description = document.createElement('p');
    description.textContent = task.description || 'No description provided.';

    const timeSpent = document.createElement('p');
    timeSpent.className = 'task-time';
    timeSpent.textContent = `⏱ Time spent: ${task.time_spent_minutes} minutes`;

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const toggleButton = document.createElement('button');
    toggleButton.textContent = task.completed ? 'Mark Open' : 'Mark Done';
    toggleButton.addEventListener('click', () => updateTask(task.id, { completed: !task.completed }));

    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => editTask(task));

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deleteTask(task.id));

    actions.append(toggleButton, editButton, deleteButton);
    card.append(meta, description, timeSpent, actions);
    taskList.append(card);
  });
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

const editTask = (task) => {
  const title = prompt('Task title (max 20 characters)', task.title);
  if (title === null) return;
  
  if (!title.trim()) {
    alert('Title cannot be empty');
    return;
  }
  
  if (title.length > 20) {
    alert('Title must be 20 characters or less');
    return;
  }
  
  const description = prompt('Task description (max 500 characters)', task.description || '');
  if (description === null) return;
  
  if (description.length > 500) {
    alert('Description must be 500 characters or less');
    return;
  }
  
  const timeSpent = prompt('Time spent (minutes)', task.time_spent_minutes || '0');
  if (timeSpent === null) return;
  updateTask(task.id, { title, description, completed: task.completed, time_spent_minutes: parseInt(timeSpent) || 0 });
};

const handleLogout = async () => {
  await request('/api/logout', { method: 'POST' });
  currentUser = null;
  showSection();
};

const exportToExcel = () => {
  const currentDateTime = new Date().toLocaleString('en-US', { 
    timeZone: 'America/New_York'
  }) + ' EST (NYC)';
  
  const data = tasks.map(task => ({
    'Export Date': currentDateTime,
    Title: task.title,
    Description: task.description,
    Completed: task.completed ? 'Yes' : 'No',
    'Time Spent (minutes)': task.time_spent_minutes,
    Created: formatDateEST(task.created_at),
    Updated: formatDateEST(task.updated_at)
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
  XLSX.writeFile(wb, 'tasks.xlsx');
};

const exportToPdf = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const currentDateTime = new Date().toLocaleString('en-US', { 
    timeZone: 'America/New_York'
  }) + ' EST (NYC)';
  
  doc.setFontSize(16);
  doc.text('My Tasks', 20, 20);
  doc.setFontSize(10);
  doc.text(`Export Date: ${currentDateTime}`, 20, 30);
  let y = 40;
  tasks.forEach(task => {
    doc.setFontSize(12);
    doc.text(`Title: ${task.title}`, 20, y);
    y += 10;
    doc.text(`Description: ${task.description || 'N/A'}`, 20, y);
    y += 10;
    doc.text(`Completed: ${task.completed ? 'Yes' : 'No'}`, 20, y);
    y += 10;
    doc.text(`Created: ${formatDateEST(task.created_at)}`, 20, y);
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
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'My Tasks',
              bold: true,
              size: 32
            })
          ]
        }),
        ...tasks.flatMap(task => [
          new Paragraph({
            children: [
              new TextRun({
                text: `Title: ${task.title}`,
                bold: true
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun(`Description: ${task.description || 'N/A'}`)
            ]
          }),
          new Paragraph({
            children: [
              new TextRun(`Completed: ${task.completed ? 'Yes' : 'No'}`)
            ]
          }),
          new Paragraph({
            children: [
              new TextRun(`Created: ${formatDateEST(task.created_at)}`)
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
authForm.addEventListener('submit', handleAuthSubmit);
taskForm.addEventListener('submit', handleTaskSubmit);
logoutButton.addEventListener('click', handleLogout);
exportExcelButton.addEventListener('click', exportToExcel);
exportPdfButton.addEventListener('click', exportToPdf);
exportWordButton.addEventListener('click', exportToWord);

setMode('login');
init();
