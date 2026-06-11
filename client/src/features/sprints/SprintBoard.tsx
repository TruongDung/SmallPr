import { useState } from 'react';
import { useT } from '../../store/i18n';
import { useToast } from '../../components/Toast';
import { useTasks } from '../../hooks/useTasks';
import { TaskColumn } from '../tasks/TaskColumn';
import { sortTasksByPriority, taskStatus } from '../tasks/taskHelpers';
import type { Sprint, Task, TaskStatus } from '../../api/types';

const COLUMNS: { status: TaskStatus; labelKey: string }[] = [
  { status: 'todo', labelKey: 'open' },
  { status: 'in_progress', labelKey: 'subInProgress' },
  { status: 'done', labelKey: 'completed' },
];

interface SprintBoardProps {
  sprint: Sprint;
  onBack: () => void;
}

export const SprintBoard = ({ sprint, onBack }: SprintBoardProps) => {
  const t = useT();
  const { showToast } = useToast();
  const { tasks, isLoading, error, updateTask, deleteTask } = useTasks(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const sprintTasks = tasks.filter(
    (task) => !task.archived && task.sprint_id === sprint.id
  );

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

  return (
    <div className="sprint-board-view">
      <div className="sprint-board-header">
        <button type="button" className="secondary" onClick={onBack}>
          ← {t('backToSprints')}
        </button>
        <div className="sprint-board-title">
          <h2>{sprint.name}</h2>
          <span className={`sprint-status-badge sprint-status-${sprint.status}`}>
            {t(`sprint_${sprint.status}`)}
          </span>
          {(sprint.start_date || sprint.end_date) && (
            <span className="sprint-dates">
              {sprint.start_date ?? '…'} → {sprint.end_date ?? '…'}
            </span>
          )}
        </div>
        {sprint.goal && <p className="sprint-board-goal">{sprint.goal}</p>}
      </div>

      {isLoading ? (
        <p className="loading-state" aria-busy="true">{t('loading')}</p>
      ) : error ? (
        <p className="field-error">{t('dashboardErrorTitle')}</p>
      ) : (
        <div className="task-board">
          {COLUMNS.map(({ status, labelKey }) => (
            <TaskColumn
              key={status}
              title={t(labelKey)}
              status={status}
              tasks={sortTasksByPriority(
                sprintTasks.filter((task) => taskStatus(task) === status)
              )}
              draggable
              onDropTask={handleDropTask}
              onDragStartTask={setDraggedTask}
              onDragEndTask={() => setDraggedTask(null)}
              cardHandlers={cardHandlers}
            />
          ))}
        </div>
      )}
    </div>
  );
};
