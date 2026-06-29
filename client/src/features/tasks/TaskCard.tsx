import { useState } from 'react';
import type { Task } from '../../api/types';
import { useT } from '../../store/i18n';
import { renderStoredRichText, getRichTextPlainText } from './richText';
import { formatLocalDateTime, priorityLabel, taskStatus } from './taskHelpers';

interface TaskCardProps {
  task: Task;
  draggable: boolean;
  onToggleDone: (task: Task) => void;
  onToggleArchive: (task: Task) => void;
  onPreview: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDragStart?: (task: Task) => void;
  onDragEnd?: () => void;
}

export const TaskCard = ({
  task,
  draggable,
  onToggleDone,
  onToggleArchive,
  onPreview,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
}: TaskCardProps) => {
  const t = useT();
  const [suppressHover, setSuppressHover] = useState(false);
  const currentStatus = taskStatus(task);
  const isArchived = Boolean(task.archived);
  const isHighPriority = task.priority === 'high';

  const className = [
    'task-item',
    isHighPriority ? 'priority-high-task' : '',
    currentStatus === 'done' ? 'completed' : '',
    isArchived ? 'archived' : '',
    suppressHover ? 'suppress-task-hover' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const descriptionPlain = getRichTextPlainText(task.description || '');
  const showPreviewButton = (task.description && descriptionPlain.length > 180) || Boolean(task.comment);

  const handleCardClick = (event: React.MouseEvent) => {
    if (window.matchMedia('(max-width: 640px)').matches && !(event.target as HTMLElement).closest('button, a')) {
      onPreview(task);
    }
  };

  return (
    <div
      className={className}
      data-task-id={task.id}
      data-status={currentStatus}
      tabIndex={0}
      draggable={draggable}
      onClick={handleCardClick}
      onDragStart={() => onDragStart?.(task)}
      onDragEnd={() => onDragEnd?.()}
    >
      <div className="task-hover-popover" role="status">
        {descriptionPlain || t('noDescription')}
      </div>

      <div className="task-meta">
        <strong>
          {task.title}
          {task.is_recurring && (
            <>
              {' '}
              <span className="recurring-badge" title="Recurring task">
                🔄
              </span>
            </>
          )}
        </strong>
        <div className="task-badges">
          <span className={`priority-badge priority-${task.priority || 'medium'}`}>
            {priorityLabel(t, task.priority)}
          </span>
          {task.tag && <span className="tag-badge">{task.tag}</span>}
        </div>
      </div>

      {task.description ? (
        <div
          className="task-description"
          dangerouslySetInnerHTML={{ __html: renderStoredRichText(task.description) }}
        />
      ) : (
        <div className="task-description">{t('noDescription')}</div>
      )}

      {task.comment && (
        <div
          className="task-comment"
          dangerouslySetInnerHTML={{
            __html: `<strong>${t('comment')}:</strong> ${renderStoredRichText(task.comment)}`,
          }}
        />
      )}

      {task.reminder_at && (
        <p className="task-reminder">
          {t('alert')}: {formatLocalDateTime(task.reminder_at)}
        </p>
      )}

      {task.attachment_data && task.attachment_name && (
        <a className="task-attachment" href={task.attachment_data} download={task.attachment_name}>
          {t('attachment')}: {task.attachment_name}
        </a>
      )}

      <div
        className="task-actions"
        onMouseEnter={() => setSuppressHover(true)}
        onMouseLeave={() => setSuppressHover(false)}
        onFocus={() => setSuppressHover(true)}
        onBlur={() => setSuppressHover(false)}
      >
        {!isArchived && (
          <button
            type="button"
            title={currentStatus === 'done' ? t('markOpen') : t('markDone')}
            onClick={() => onToggleDone(task)}
          >
            {currentStatus === 'done' ? '↻' : '✓'}
          </button>
        )}
        {showPreviewButton && (
          <button type="button" title={t('preview')} onClick={() => onPreview(task)}>
            👁
          </button>
        )}
        <button type="button" title={t('edit')} onClick={() => onEdit(task)}>
          ✎
        </button>
        <button type="button" title={isArchived ? t('restore') : t('archive')} onClick={() => onToggleArchive(task)}>
          {isArchived ? '↥' : '▣'}
        </button>
        <button type="button" className="danger" title={t('delete')} onClick={() => onDelete(task)}>
          ×
        </button>
      </div>
    </div>
  );
};
