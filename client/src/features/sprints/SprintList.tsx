import { useState } from 'react';
import { useT } from '../../store/i18n';
import { useToast } from '../../components/Toast';
import { useSprints } from '../../hooks/useSprints';
import { SprintForm } from './SprintForm';
import type { Sprint, SprintPayload } from '../../api/types';

interface SprintListProps {
  onSelectSprint: (sprint: Sprint) => void;
}

const STATUS_ORDER: Record<string, number> = { active: 0, planned: 1, completed: 2 };

export const SprintList = ({ onSelectSprint }: SprintListProps) => {
  const t = useT();
  const { showToast } = useToast();
  const { sprints, isLoading, createSprint, updateSprint, deleteSprint } = useSprints();

  const [formOpen, setFormOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const handleOpenCreate = () => {
    setEditingSprint(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (sprint: Sprint, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingSprint(sprint);
    setFormOpen(true);
  };

  const handleSave = async (payload: SprintPayload) => {
    if (editingSprint) {
      await updateSprint({ id: editingSprint.id, payload });
    } else {
      await createSprint(payload);
    }
    showToast(t('sprintSaved'));
  };

  const handleDelete = async (sprint: Sprint, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm(`${t('confirmDelete')} "${sprint.name}"?`)) return;
    await deleteSprint(sprint.id);
    showToast(t('sprintDeleted'));
  };

  if (isLoading) {
    return <p className="loading-state" aria-busy="true">{t('loading')}</p>;
  }

  const sorted = [...sprints].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3)
  );

  return (
    <div className="sprint-list-view">
      <div className="sprint-list-header">
        <h2>{t('sprints')}</h2>
        <button type="button" onClick={handleOpenCreate}>
          + {t('newSprint')}
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="task-empty">{t('noSprints')}</p>
      ) : (
        <div className="sprint-cards">
          {sorted.map((sprint) => (
            <div
              key={sprint.id}
              className={`sprint-card sprint-card-${sprint.status}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectSprint(sprint)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectSprint(sprint)}
            >
              <div className="sprint-card-header">
                <span className={`sprint-status-badge sprint-status-${sprint.status}`}>
                  {t(`sprint_${sprint.status}`)}
                </span>
                <div className="sprint-card-actions">
                  <button
                    type="button"
                    title={t('editSprint')}
                    onClick={(e) => handleOpenEdit(sprint, e)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="danger"
                    title={t('deleteSprint')}
                    onClick={(e) => handleDelete(sprint, e)}
                  >
                    ×
                  </button>
                </div>
              </div>

              <h3 className="sprint-card-name">{sprint.name}</h3>

              {sprint.goal && (
                <p className="sprint-card-goal">{sprint.goal}</p>
              )}

              <div className="sprint-card-meta">
                {(sprint.start_date || sprint.end_date) && (
                  <span className="sprint-dates">
                    {sprint.start_date ?? '…'} → {sprint.end_date ?? '…'}
                  </span>
                )}
                <span className="sprint-task-count">
                  {sprint.task_count ?? 0} {t('sprintTasks')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <SprintForm
        open={formOpen}
        sprint={editingSprint}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
};
