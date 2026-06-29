// Demo mode: allows unauthenticated users to try Tasks and Transactions
// using localStorage as a mock backend. No server calls are made in demo mode.
(function () {
  const DEMO_KEY = 'demoMode';
  const DEMO_TASKS_KEY = 'demoTasks';
  const DEMO_TRANSACTIONS_KEY = 'demoTransactions';
  const DEMO_NOTES_KEY = 'demoNotes';
  const DEMO_SPRINTS_KEY = 'demoSprints';

  const isDemo = () => localStorage.getItem(DEMO_KEY) === 'true';

  const enterDemo = () => {
    localStorage.setItem(DEMO_KEY, 'true');
    // Seed sample data if none exists
    if (!localStorage.getItem(DEMO_TASKS_KEY)) {
      const now = new Date().toISOString();
      const sampleTasks = [
        {
          id: 1,
          title: 'Welcome to Demo!',
          tag: 'demo',
          priority: 'high',
          status: 'todo',
          description: 'This is a sample task. Try creating, editing, and completing tasks.',
          comment: '',
          created_at: now,
          updated_at: now,
        },
        {
          id: 2,
          title: 'Try adding a task',
          tag: 'demo',
          priority: 'medium',
          status: 'todo',
          description: 'Click the + button to add your own task.',
          comment: '',
          created_at: now,
          updated_at: now,
        },
        {
          id: 3,
          title: 'Drag to change status',
          tag: '',
          priority: 'low',
          status: 'in_progress',
          description: 'Drag task cards between columns to update their status.',
          comment: '',
          created_at: now,
          updated_at: now,
        },
      ];
      localStorage.setItem(DEMO_TASKS_KEY, JSON.stringify(sampleTasks));
    }
    if (!localStorage.getItem(DEMO_TRANSACTIONS_KEY)) {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
      const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const sampleTransactions = [
        {
          id: 1,
          kind: 'income',
          category: 'Salary',
          amount: 5000.0,
          occurred_on: today,
          note: 'Monthly salary',
          account: '',
        },
        { id: 2, kind: 'expense', category: 'Food', amount: 35.0, occurred_on: today, note: 'Breakfast', account: '' },
        {
          id: 3,
          kind: 'expense',
          category: 'Bills & Home',
          amount: 850.0,
          occurred_on: today,
          note: 'Electricity bill',
          account: '',
        },
        {
          id: 4,
          kind: 'expense',
          category: 'Transport',
          amount: 80.0,
          occurred_on: yesterday,
          note: 'Gas station',
          account: '',
        },
        {
          id: 5,
          kind: 'expense',
          category: 'Food',
          amount: 65.0,
          occurred_on: yesterday,
          note: 'Bubble tea',
          account: '',
        },
        {
          id: 6,
          kind: 'expense',
          category: 'Food',
          amount: 42.0,
          occurred_on: twoDaysAgo,
          note: 'Lunch with team',
          account: '',
        },
        {
          id: 7,
          kind: 'expense',
          category: 'Shopping',
          amount: 120.0,
          occurred_on: twoDaysAgo,
          note: 'New headphones',
          account: '',
        },
        {
          id: 8,
          kind: 'expense',
          category: 'Transport',
          amount: 25.0,
          occurred_on: threeDaysAgo,
          note: 'Uber to office',
          account: '',
        },
        {
          id: 9,
          kind: 'expense',
          category: 'Food',
          amount: 18.5,
          occurred_on: threeDaysAgo,
          note: 'Coffee & snack',
          account: '',
        },
        {
          id: 10,
          kind: 'expense',
          category: 'Entertainment',
          amount: 15.99,
          occurred_on: fiveDaysAgo,
          note: 'Netflix subscription',
          account: '',
        },
        {
          id: 11,
          kind: 'expense',
          category: 'Health',
          amount: 50.0,
          occurred_on: fiveDaysAgo,
          note: 'Gym monthly',
          account: '',
        },
        {
          id: 12,
          kind: 'income',
          category: 'Freelance',
          amount: 800.0,
          occurred_on: weekAgo,
          note: 'Side project payment',
          account: '',
        },
        {
          id: 13,
          kind: 'expense',
          category: 'Food',
          amount: 95.0,
          occurred_on: weekAgo,
          note: 'Grocery shopping',
          account: '',
        },
        {
          id: 14,
          kind: 'expense',
          category: 'Bills & Home',
          amount: 200.0,
          occurred_on: weekAgo,
          note: 'Internet + phone',
          account: '',
        },
      ];
      localStorage.setItem(DEMO_TRANSACTIONS_KEY, JSON.stringify(sampleTransactions));
    }
    if (!localStorage.getItem(DEMO_NOTES_KEY)) {
      const now = new Date().toISOString();
      const sampleNotes = [
        {
          id: 1,
          title: 'Welcome to Notes',
          body: '# Getting Started\n\nThis is a sample note. Try editing it!\n\n- You can use **markdown** formatting\n- Create checklists with `- [ ]`\n- Paste images to extract text (OCR)',
          pinned: 1,
          created_at: now,
          updated_at: now,
        },
        {
          id: 2,
          title: 'Meeting Notes',
          body: '## Team Meeting - June 2026\n\n**Attendees:** Alice, Bob, Charlie\n\n### Action Items\n- [ ] Review project timeline\n- [ ] Update documentation\n- [x] Send weekly report\n\n### Notes\nDiscussed upcoming release. Need to finalize by end of month.',
          pinned: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: 3,
          title: 'Shopping List',
          body: '- [ ] Milk\n- [ ] Bread\n- [ ] Eggs\n- [ ] Coffee\n- [x] Butter\n- [ ] Vegetables',
          pinned: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: 4,
          title: 'Quick Ideas',
          body: 'Some random ideas to explore later:\n\n1. Build a habit tracker\n2. Learn a new programming language\n3. Read more books this month\n\n> "The best time to start is now."',
          pinned: 0,
          created_at: now,
          updated_at: now,
        },
      ];
      localStorage.setItem(DEMO_NOTES_KEY, JSON.stringify(sampleNotes));
    }
    if (!localStorage.getItem(DEMO_SPRINTS_KEY)) {
      const now = new Date().toISOString();
      const today = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const sampleSprints = [
        {
          id: 1,
          name: 'Sprint 1 - MVP',
          goal: 'Deliver the minimum viable product with core task management features.',
          status: 'active',
          start_date: lastWeek,
          end_date: nextWeek,
          archived: 0,
          task_count: 2,
          created_at: now,
          updated_at: now,
        },
        {
          id: 2,
          name: 'Sprint 2 - Polish',
          goal: 'UI improvements and bug fixes based on user feedback.',
          status: 'planned',
          start_date: nextWeek,
          end_date: null,
          archived: 0,
          task_count: 1,
          created_at: now,
          updated_at: now,
        },
      ];
      localStorage.setItem(DEMO_SPRINTS_KEY, JSON.stringify(sampleSprints));
      // Assign some tasks to sprints
      const tasks = getTasks();
      if (tasks.length >= 3) {
        tasks[0].sprint_id = 1;
        tasks[1].sprint_id = 1;
        tasks[2].sprint_id = 2;
        saveTasks(tasks);
      }
    }
  };

  const exitDemo = () => {
    localStorage.removeItem(DEMO_KEY);
    localStorage.removeItem(DEMO_TASKS_KEY);
    localStorage.removeItem(DEMO_TRANSACTIONS_KEY);
    localStorage.removeItem(DEMO_NOTES_KEY);
    localStorage.removeItem(DEMO_SPRINTS_KEY);
  };

  // --- Mock API for demo mode ---
  let nextTaskId = 100;
  let nextTxnId = 100;

  const getTasks = () => {
    try {
      return JSON.parse(localStorage.getItem(DEMO_TASKS_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const saveTasks = (tasks) => localStorage.setItem(DEMO_TASKS_KEY, JSON.stringify(tasks));

  const getTransactions = () => {
    try {
      return JSON.parse(localStorage.getItem(DEMO_TRANSACTIONS_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const saveTransactions = (txns) => localStorage.setItem(DEMO_TRANSACTIONS_KEY, JSON.stringify(txns));

  const getNotes = () => {
    try {
      return JSON.parse(localStorage.getItem(DEMO_NOTES_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const saveNotes = (notes) => localStorage.setItem(DEMO_NOTES_KEY, JSON.stringify(notes));

  const getSprints = () => {
    try {
      return JSON.parse(localStorage.getItem(DEMO_SPRINTS_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const saveSprints = (sprints) => localStorage.setItem(DEMO_SPRINTS_KEY, JSON.stringify(sprints));

  let nextNoteId = 100;
  let nextSprintId = 100;

  // Build a dashboard payload shaped like the real /api/dashboard response.
  // Each card must be { ok: true, data: ... } or the UI renders a load error.
  const buildDashboardPayload = () => {
    const tasks = getTasks();
    const todayKey = new Date().toISOString().slice(0, 10);

    const isDone = (task) => task.status === 'done';
    const inProgress = tasks.filter((task) => task.status === 'in_progress');
    const todoTasks = tasks.filter((task) => task.status === 'todo');

    // Overdue = has a due_date strictly before today and not done.
    const overdue = tasks.filter((task) => task.due_date && task.due_date < todayKey && !isDone(task));
    // Today = due today, or undated todo tasks (so the card isn't empty in demo).
    const today = tasks.filter(
      (task) => !isDone(task) && (task.due_date === todayKey || (!task.due_date && task.status === 'todo')),
    );

    const cards = {
      todaysTasks: {
        ok: true,
        data: { overdue, today, in_progress: inProgress },
      },
      activeSprints: {
        ok: true,
        data: {
          sprints: getSprints()
            .filter((s) => !s.archived && (s.status === 'active' || s.status === 'planned'))
            .map((s) => {
              const sprintTasks = tasks.filter((t) => t.sprint_id === s.id && !t.archived);
              return {
                id: s.id,
                name: s.name,
                status: s.status,
                start_date: s.start_date,
                end_date: s.end_date,
                task_count: sprintTasks.length,
                done_count: sprintTasks.filter(isDone).length,
              };
            }),
        },
      },
      taskStatusSummary: {
        ok: true,
        data: {
          todo: todoTasks.length,
          in_progress: inProgress.length,
          done: tasks.filter(isDone).length,
        },
      },
      bills: {
        ok: true,
        data: {
          overdue: [],
          dueSoon: getTransactions()
            .slice()
            .sort((a, b) => (b.occurred_on || '').localeCompare(a.occurred_on || ''))
            .slice(0, 5)
            .map((tx) => ({
              id: tx.id,
              item: `${tx.note || tx.category}${tx.kind === 'income' ? ' (income)' : ''}`,
              amount: tx.amount,
              due_date: tx.occurred_on,
              status: tx.kind === 'income' ? 'Income' : 'Expense',
            })),
          undated: [],
        },
      },
      creditCards: { ok: true, data: { cardCount: 0, totalBalance: 0, totalInterest: 0, approachingClose: [] } },
      recentNotes: {
        ok: true,
        data: getNotes()
          .slice(0, 5)
          .map((note) => ({
            id: note.id,
            title: note.title || 'Untitled',
            excerpt: (note.body || '').slice(0, 120),
            updated_at: note.updated_at,
          })),
      },
      weather: { ok: true, data: { city: null } },
      dailyQuote: {
        ok: true,
        data: {
          text: 'The secret of getting ahead is getting started.',
          author: 'Mark Twain',
        },
      },
    };

    // Hide Bills, Credit Cards, and Weather cards in demo mode by marking
    // them not visible in the dashboard preferences. Order matches the
    // default card order in dashboard.module.js.
    const demoPreferences = {
      version: 1,
      defaultLanding: 'today',
      cards: [
        { id: 'todaysTasks', visible: true, order: 0 },
        { id: 'activeSprints', visible: true, order: 1 },
        { id: 'taskStatusSummary', visible: true, order: 2 },
        { id: 'bills', visible: true, order: 3 },
        { id: 'creditCards', visible: false, order: 4 },
        { id: 'recentNotes', visible: true, order: 5 },
        { id: 'weather', visible: false, order: 6 },
        { id: 'dailyQuote', visible: true, order: 7 },
      ],
    };

    return { cards, preferences: demoPreferences, today: todayKey };
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
    // Summary feeds the Income / Expense / Net cards. Must be matched before the
    // generic /api/transactions GET below, which would otherwise swallow it.
    if (url.match(/^\/api\/transactions\/summary/) && method === 'GET') {
      const txns = getTransactions();
      const num = (value) => Number(value) || 0;
      const income = txns.filter((tx) => tx.kind === 'income').reduce((sum, tx) => sum + num(tx.amount), 0);
      const expense = txns.filter((tx) => tx.kind === 'expense').reduce((sum, tx) => sum + num(tx.amount), 0);
      return { summary: { income, expense, net: income - expense } };
    }
    if (url.match(/^\/api\/transactions\/categories/) && method === 'GET') {
      const categories = [
        ...new Set(
          getTransactions()
            .map((tx) => tx.category)
            .filter(Boolean),
        ),
      ];
      return { categories };
    }
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

    // --- Sprints ---
    if ((url === '/api/sprints' || url.startsWith('/api/sprints?')) && method === 'GET') {
      const archived = url.includes('archived=true');
      const sprints = getSprints().filter((s) => (archived ? s.archived : !s.archived));
      // Attach task_count dynamically
      const tasks = getTasks();
      return {
        sprints: sprints.map((s) => ({
          ...s,
          task_count: tasks.filter((t) => t.sprint_id === s.id && !t.archived).length,
        })),
      };
    }
    if (url === '/api/sprints' && method === 'POST') {
      const sprints = getSprints();
      const sprint = {
        id: nextSprintId++,
        name: body.name || 'Untitled Sprint',
        goal: body.goal || '',
        status: body.status || 'planned',
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        archived: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      sprints.push(sprint);
      saveSprints(sprints);
      return { sprint };
    }
    if (url.match(/^\/api\/sprints\/\d+$/) && method === 'PUT') {
      const id = Number(url.split('/').pop());
      const sprints = getSprints();
      const index = sprints.findIndex((s) => s.id === id);
      if (index === -1) return { error: 'Sprint not found' };
      sprints[index] = { ...sprints[index], ...body, updated_at: new Date().toISOString() };
      if (body.archived !== undefined) sprints[index].archived = body.archived ? 1 : 0;
      saveSprints(sprints);
      return { sprint: sprints[index] };
    }
    if (url.match(/^\/api\/sprints\/\d+$/) && method === 'DELETE') {
      const id = Number(url.split('/').pop());
      const sprints = getSprints().filter((s) => s.id !== id);
      saveSprints(sprints);
      return { success: true };
    }

    // --- Stubs for other endpoints (return empty/safe defaults) ---
    if (url === '/api/tags') return { tags: [] };
    if (url === '/api/me') return { user: null };
    if (url === '/api/config/public') return { sentry: {}, posthog: {} };
    if (url.includes('/trash')) return { tasks: [] };
    if (url.includes('/purge')) return { success: true };
    if (url === '/api/credit-cards') return { cards: [] };
    if (url === '/api/credit-cards/users') return { users: [] };
    if (url === '/api/credit-cards/fast-access-bills') return { bills: [] };
    if (url === '/api/credit-cards/fast-access-links') return { links: [] };
    if (url === '/api/weather-cities') return { cities: [] };
    if (url === '/api/notes' && method === 'GET') {
      return { notes: getNotes() };
    }
    if (url === '/api/notes' && method === 'POST') {
      const notes = getNotes();
      const note = {
        id: nextNoteId++,
        title: body.title || '',
        body: body.body || '',
        pinned: 0,
        task_id: body.task_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      notes.unshift(note);
      saveNotes(notes);
      return { note };
    }
    if (url.match(/^\/api\/notes\/\d+$/) && method === 'PUT') {
      const id = Number(url.split('/').pop());
      const notes = getNotes();
      const index = notes.findIndex((n) => n.id === id);
      if (index === -1) return { error: 'Note not found' };
      notes[index] = { ...notes[index], ...body, updated_at: new Date().toISOString() };
      saveNotes(notes);
      return { note: notes[index] };
    }
    if (url.match(/^\/api\/notes\/\d+\/pin$/) && method === 'PATCH') {
      const id = Number(url.split('/')[3]);
      const notes = getNotes();
      const index = notes.findIndex((n) => n.id === id);
      if (index === -1) return { error: 'Note not found' };
      notes[index].pinned = body.pinned ? 1 : 0;
      notes[index].updated_at = new Date().toISOString();
      saveNotes(notes);
      return { note: notes[index] };
    }
    if (url.match(/^\/api\/notes\/\d+$/) && method === 'DELETE') {
      const id = Number(url.split('/').pop());
      const notes = getNotes().filter((n) => n.id !== id);
      saveNotes(notes);
      return { success: true };
    }
    if (url.match(/^\/api\/notes\/\d+\/versions/) && method === 'GET') {
      return {
        versions: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
      };
    }
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
