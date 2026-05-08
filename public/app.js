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

  if (!title) {
    return;
  }

  const result = await request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  });

  if (result.task) {
    authForm.reset();
    taskForm.reset();
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
    card.append(meta, description, actions);
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
  const title = prompt('Task title', task.title);
  if (title === null) return;
  const description = prompt('Task description', task.description || '');
  if (description === null) return;
  updateTask(task.id, { title, description, completed: task.completed });
};

const handleLogout = async () => {
  await request('/api/logout', { method: 'POST' });
  currentUser = null;
  showSection();
};

const exportToExcel = () => {
  const data = tasks.map(task => ({
    Title: task.title,
    Description: task.description,
    Completed: task.completed ? 'Yes' : 'No',
    Created: new Date(task.created_at).toLocaleDateString(),
    Updated: new Date(task.updated_at).toLocaleDateString()
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
  XLSX.writeFile(wb, 'tasks.xlsx');
};

const exportToPdf = () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('My Tasks', 20, 20);
  let y = 40;
  tasks.forEach(task => {
    doc.setFontSize(12);
    doc.text(`Title: ${task.title}`, 20, y);
    y += 10;
    doc.text(`Description: ${task.description || 'N/A'}`, 20, y);
    y += 10;
    doc.text(`Completed: ${task.completed ? 'Yes' : 'No'}`, 20, y);
    y += 10;
    doc.text(`Created: ${new Date(task.created_at).toLocaleDateString()}`, 20, y);
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
              new TextRun(`Created: ${new Date(task.created_at).toLocaleDateString()}`)
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
