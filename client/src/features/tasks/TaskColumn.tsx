import { useState } from 'react';
import type { Task } from '../../api/types';
import { TaskCard } from './TaskCard';
import { useT } from '../../store/i18n';

interface TaskColumnProps {
  title: string;
  status: string;
  tasks: Task[];
  draggable: boolean;
  wide?: boolean;
  onDropTask?: (status: string) => void;
  onDragStartTask?: (task: Task) => void;
  onDragEndTask?: () => void;
  cardHandlers: {
    onToggleDone: (task: Task) => void;
    onToggleArchive: (task: Task) => void;
    onPreview: (task: Task) => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
  };
}

export const TaskColumn = ({
  title,
  status,
  tasks,
  draggable,
  wide,
  onDropTask,
  onDragStartTask,
  onDragEndTask,
  cardHandlers,
}: TaskColumnProps) => {
  const t = useT();
  const [dragOver, setDragOver] = useState(false);

  const isDroppable = draggable && Boolean(onDropTask);

  return (
    <section className={`task-column task-column-${status}${wide ? ' task-column-wide' : ''}`} data-status={status}>
      <div className="task-column-header">
        <h3>{title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>
      <div
        className={`task-column-body${dragOver ? ' drag-over' : ''}`}
        data-status={status}
        onDragOver={
          isDroppable
            ? (event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }
            : undefined
        }
        onDragEnter={
          isDroppable
            ? (event) => {
                event.preventDefault();
                setDragOver(true);
              }
            : undefined
        }
        onDragLeave={
          isDroppable
            ? (event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragOver(false);
                }
              }
            : undefined
        }
        onDrop={
          isDroppable
            ? (event) => {
                event.preventDefault();
                setDragOver(false);
                onDropTask?.(status);
              }
            : undefined
        }
      >
        {tasks.length === 0 ? (
          <p className="task-empty">{t('noRecords')}</p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              draggable={draggable}
              onDragStart={onDragStartTask}
              onDragEnd={onDragEndTask}
              {...cardHandlers}
            />
          ))
        )}
      </div>
    </section>
  );
};
