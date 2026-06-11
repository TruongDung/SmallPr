import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTasks } from './hooks/useTasks';
import { useRealtime } from './hooks/useRealtime';
import { useI18n } from './store/i18n';
import { useTheme } from './store/theme';
import { useToast } from './components/Toast';
import { LoginGate } from './features/auth/LoginGate';
import { TaskColumn } from './features/tasks/TaskColumn';
import { SprintList } from './features/sprints/SprintList';
import { SprintBoard } from './features/sprints/SprintBoard';
import { sortTasksByPriority, taskStatus } from './features/tasks/taskHelpers';
import type { Sprint, Task, TaskStatus } from './api/types';

const COLUMNS: { status: TaskStatus; labelKey: string }[] = [
  { status: 'todo', labelKey: 'open' },
  { status: 'in_progress', labelKey: 'subInProgress' },
  { status: 'done', labelKey: 'completed' },
];

const TaskBoard = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { tasks, isLoading, error, updateTask, deleteTask } = useTasks(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // Keep the board live across clients/devices once the user is authenticated.
  useRealtime(true);

  const cardHandlers = {
    onToggleDone: async (task: Task) => {
      const nextStatus: TaskStatus = taskStatus(task) === 'done' ? 'todo' : 'done';
      await updateTask({
        id: task.id,
        payload: { status: nextStatus, completed: nextStatus === 'done' },
      });
    },
    onToggleArchive: async (task: Task) => {
      await updateTask({ id: task.id, payload: { archived: !task.archived } });
      showToast(task.archived ? t('restore') : t('archive'));
    },
    onPreview: (_task: Task) => {},
    onEdit: (_task: Task) => {},
    onDelete: async (task: Task) => {
      await deleteTask(task.id);
      showToast(t('delete'));
    },
  };

  const handleDropTask = async (status: string) => {
    if (!draggedTask || taskStatus(draggedTask) === status) {
      setDraggedTask(null);
      return;
    }
    const nextStatus = status as TaskStatus;
    await updateTask({
      id: draggedTask.id,
      payload: { status: nextStatus, completed: nextStatus === 'done' },
    });
    setDraggedTask(null);
  };

  if (isLoading) {
    return <p className="loading-state" aria-busy="true">{t('savingTask')}</p>;
  }

  if (error) {
    return <p className="field-error">{t('dashboardErrorTitle')}</p>;
  }

  const activeTasks = tasks.filter((task) => !task.archived);

  return (
    <div className="task-board">
      {COLUMNS.map(({ status, labelKey }) => (
        <TaskColumn
          key={status}
          title={t(labelKey)}
          status={status}
          tasks={sortTasksByPriority(
            activeTasks.filter((task) => taskStatus(task) === status),
          )}
          draggable
          onDropTask={handleDropTask}
          onDragStartTask={setDraggedTask}
          onDragEndTask={() => setDraggedTask(null)}
          cardHandlers={cardHandlers}
        />
      ))}
    </div>
  );
};

const SprintView = () => {
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);

  if (selectedSprint) {
    return (
      <SprintBoard
        sprint={selectedSprint}
        onBack={() => setSelectedSprint(null)}
      />
    );
  }

  return <SprintList onSelectSprint={setSelectedSprint} />;
};

const Header = () => {
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="app-header-titles">
        <h1>{t('appTitle')}</h1>
        <p>{t('welcome', { name: user?.name || user?.username || '' })}</p>
      </div>
      <div className="app-header-actions">
        <label className="language-select">
          {t('language')}:{' '}
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="en">English</option>
            <option value="vi">Tiếng Việt</option>
          </select>
        </label>
        <button type="button" className="secondary" onClick={toggleTheme}>
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
        <button type="button" className="secondary" onClick={() => logout()}>
          {t('logout')}
        </button>
      </div>
    </header>
  );
};

type AppTab = 'board' | 'sprints';

export const App = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<AppTab>('board');

  return (
    <LoginGate>
      <div className="app-shell">
        <Header />
        <nav className="app-tab-nav" aria-label="Main navigation">
          <button
            type="button"
            className={`app-tab${tab === 'board' ? ' app-tab-active' : ''}`}
            onClick={() => setTab('board')}
          >
            {t('tasks')}
          </button>
          <button
            type="button"
            className={`app-tab${tab === 'sprints' ? ' app-tab-active' : ''}`}
            onClick={() => setTab('sprints')}
          >
            {t('sprints')}
          </button>
        </nav>
        <main className="app-main">
          {tab === 'board' ? <TaskBoard /> : <SprintView />}
        </main>
      </div>
    </LoginGate>
  );
};
