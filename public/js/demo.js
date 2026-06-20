// Demo mode: allows unauthenticated users to try Tasks and Transactions
// using localStorage as a mock backend. No server calls are made in demo mode.
(function () {
  const DEMO_KEY = 'demoMode';
  const DEMO_TASKS_KEY = 'demoTasks';
  const DEMO_TRANSACTIONS_KEY = 'demoTransactions';

  const isDemo = () => localStorage.getItem(DEMO_KEY) === 'true';

  const enterDemo = () => {
    localStorage.setItem(DEMO_KEY, 'true');
    // Seed sample data if none exists
    if (!localStorage.getItem(DEMO_TASKS_KEY)) {
      const now = new Date().toISOString();
      const sampleTasks = [
        { id: 1, title: 'Welcome to Demo!', tag: 'demo', priority: 'high', status: 'todo', description: 'This is a sample task. Try creating, editing, and completing tasks.', comment: '', created_at: now, updated_at: now },
        { id: 2, title: 'Try adding a task', tag: 'demo', priority: 'medium', status: 'todo', description: 'Click the + button to add your own task.', comment: '', created_at: now, updated_at: now },
        { id: 3, title: 'Drag to change status', tag: '', priority: 'low', status: 'in_progress', description: 'Drag task cards between columns to update their status.', comment: '', created_at: now, updated_at: now },
      ];
      localStorage.setItem(DEMO_TASKS_KEY, JSON.stringify(sampleTasks));
    }
    if (!localStorage.getItem(DEMO_TRANSACTIONS_KEY)) {
      const sampleTransactions = [
        { id: 1, kind: 'expense', category: 'Food', amount: 25.50, occurred_on: new Date().toISOString().slice(0, 10), note: 'Lunch', account: '' },
        { id: 2, kind: 'expense', category: 'Transport', amount: 15.00, occurred_on: new Date().toISOString().slice(0, 10), note: 'Uber', account: '' },
        { id: 3, kind: 'income', category: 'Salary', amount: 5000.00, occurred_on: new Date().toISOString().slice(0, 10), note: 'Monthly salary', account: '' },
      ];
      localStorage.setItem(DEMO_TRANSACTIONS_KEY, JSON.stringify(sampleTransactions));
    }
  };

  const exitDemo = () => {
    localStorage.removeItem(DEMO_KEY);
    localStorage.removeItem(DEMO_TASKS_KEY);
    localStorage.removeItem(DEMO_TRANSACTIONS_KEY);
  };

  // --- Mock API for demo mode ---
  let nextTaskId = 100;
  let nextTxnId = 100;

  const getTasks = () => {
    try { return JSON.parse(localStorage.getItem(DEMO_TASKS_KEY) || '[]'); }
    catch { return []; }
  };

  const saveTasks = (tasks) => localStorage.setItem(DEMO_TASKS_KEY, JSON.stringify(tasks));

  const getTransactions = () => {
    try { return JSON.parse(localStorage.getItem(DEMO_TRANSACTIONS_KEY) || '[]'); }
    catch { return []; }
  };

  const saveTransactions = (txns) => localStorage.setItem(DEMO_TRANSACTIONS_KEY, JSON.stringify(txns));

  // Build a dashboard payload shaped like the real /api/dashboard response.
  // Each card must be { ok: true, data: ... } or the UI renders a load error.
  const buildDashboardPayload = () => {
    const tasks = getTasks();
    const todayKey = new Date().toISOString().slice(0, 10);

    const isDone = (task) => task.status === 'done';
    const inProgress = tasks.filter((task) => task.status === 'in_progress');
    const todoTasks = tasks.filter((task) => task.status === 'todo');

    // Overdue = has a due_date strictly before today and not done.
    const overdue = tasks.filter((task) => (
      task.due_date && task.due_date < todayKey && !isDone(task)
    ));
    // Today = due today, or undated todo tasks (so the card isn't empty in demo).
    const today = tasks.filter((task) => (
      !isDone(task) && (task.due_date === todayKey || (!task.due_date && task.status === 'todo'))
    ));

    const cards = {
      todaysTasks: {
        ok: true,
        data: { overdue, today, in_progress: inProgress },
      },
      activeSprints: { ok: true, data: { sprints: [] } },
      taskStatusSummary: {
        ok: true,
        data: {
          todo: todoTasks.length,
          in_progress: inProgress.length,
          done: tasks.filter(isDone).length,
        },
      },
      bills: { ok: true, data: { overdue: [], dueSoon: [], undated: [] } },
      creditCards: {
        ok: true,
        data: { cardCount: 0, totalBalance: 0, totalInterest: 0, approachingClose: [] },
      },
      recentNotes: { ok: true, data: [] },
      weather: { ok: true, data: { city: null } },
      dailyQuote: {
        ok: true,
        data: {
          text: 'The secret of getting ahead is getting started.',
          author: 'Mark Twain',
        },
      },
    };

    return { cards, preferences: null, today: todayKey };
  };

  // Intercepts fetch-like requests in demo mode and returns mock responses.
  const mockRequest = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};

    // --- Tasks ---
    if (url === '/api/tasks' && method === 'GET') {
      return { tasks: getTasks() };
    }
    if (url === '/api/tasks' && method === 'POST') {
      const tasks = getTasks();
      const task = {
        id: nextTaskId++,
        title: body.title || 'Untitled',
        tag: body.tag || '',
        priority: body.priority || 'medium',
        status: body.status || 'todo',
        description: body.description || '',
        comment: body.comment || '',
        due_date: body.due_date || null,
        reminder_at: body.reminder_at || null,
        archived: 0,
        completed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      tasks.push(task);
      saveTasks(tasks);
      return { task };
    }
    if (url.match(/^\/api\/tasks\/\d+$/) && method === 'PUT') {
      const id = Number(url.split('/').pop());
      const tasks = getTasks();
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) return { error: 'Task not found' };
      tasks[index] = { ...tasks[index], ...body, updated_at: new Date().toISOString() };
      if (body.status === 'done') tasks[index].completed = 1;
      saveTasks(tasks);
      return { task: tasks[index] };
    }
    if (url.match(/^\/api\/tasks\/\d+$/) && method === 'DELETE') {
      const id = Number(url.split('/').pop());
      const tasks = getTasks().filter((t) => t.id !== id);
      saveTasks(tasks);
      return { success: true };
    }
    if (url.match(/^\/api\/tasks\/\d+$/) && method === 'GET') {
      const id = Number(url.split('/').pop());
      const task = getTasks().find((t) => t.id === id);
      return task ? { task } : { error: 'Not found' };
    }

    // --- Transactions ---
    if (url.match(/^\/api\/transactions/) && method === 'GET') {
      return { transactions: getTransactions() };
    }
    if (url === '/api/transactions' && method === 'POST') {
      const txns = getTransactions();
      const txn = {
        id: nextTxnId++,
        kind: body.kind || 'expense',
        category: body.category || '',
        amount: body.amount || 0,
        occurred_on: body.occurred_on || new Date().toISOString().slice(0, 10),
        note: body.note || '',
        account: body.account || '',
        credit_card_id: body.credit_card_id || null,
      };
      txns.push(txn);
      saveTransactions(txns);
      return { transaction: txn };
    }
    if (url.match(/^\/api\/transactions\/\d+$/) && method === 'PUT') {
      const id = Number(url.split('/').pop());
      const txns = getTransactions();
      const index = txns.findIndex((t) => t.id === id);
      if (index === -1) return { error: 'Not found' };
      txns[index] = { ...txns[index], ...body };
      saveTransactions(txns);
      return { transaction: txns[index] };
    }
    if (url.match(/^\/api\/transactions\/\d+$/) && method === 'DELETE') {
      const id = Number(url.split('/').pop());
      const txns = getTransactions().filter((t) => t.id !== id);
      saveTransactions(txns);
      return { success: true };
    }

    // --- Stubs for other endpoints (return empty/safe defaults) ---
    if (url === '/api/tags') return { tags: [] };
    if (url === '/api/sprints') return { sprints: [] };
    if (url === '/api/me') return { user: null };
    if (url === '/api/config/public') return { sentry: {}, posthog: {} };
    if (url.includes('/trash')) return { tasks: [] };
    if (url.includes('/purge')) return { success: true };
    if (url === '/api/credit-cards') return { cards: [] };
    if (url === '/api/credit-cards/users') return { users: [] };
    if (url === '/api/credit-cards/fast-access-bills') return { bills: [] };
    if (url === '/api/credit-cards/fast-access-links') return { links: [] };
    if (url === '/api/weather-cities') return { cities: [] };
    if (url === '/api/notes') return { notes: [] };
    if (url === '/api/dashboard' || url.startsWith('/api/dashboard?')) return buildDashboardPayload();

    // Default: return empty success
    return {};
  };

  window.DemoMode = {
    isDemo,
    enterDemo,
    exitDemo,
    mockRequest,
  };
})();
