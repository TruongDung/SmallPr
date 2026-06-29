import { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { useT } from '../../store/i18n';
import type { Sprint, SprintPayload, SprintStatus } from '../../api/types';

interface SprintFormProps {
  open: boolean;
  sprint?: Sprint | null;
  onSave: (payload: SprintPayload) => Promise<void>;
  onClose: () => void;
}

const STATUSES: SprintStatus[] = ['planned', 'active', 'completed'];

export const SprintForm = ({ open, sprint, onSave, onClose }: SprintFormProps) => {
  const t = useT();
  const isEdit = Boolean(sprint);

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<SprintStatus>('planned');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(sprint?.name ?? '');
      setGoal(sprint?.goal ?? '');
      setStartDate(sprint?.start_date ?? '');
      setEndDate(sprint?.end_date ?? '');
      setStatus(sprint?.status ?? 'planned');
      setError('');
    }
  }, [open, sprint]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError(t('sprintNameRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        goal: goal.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
      });
      onClose();
    } catch {
      setError(t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? t('editSprint') : t('newSprint')} titleId="sprint-form-title">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="sprint-name">{t('sprintName')}</label>
          <input
            id="sprint-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="sprint-goal">{t('sprintGoal')}</label>
          <textarea id="sprint-goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} maxLength={2000} />
        </div>

        <div className="form-group">
          <label htmlFor="sprint-start">{t('sprintStart')}</label>
          <input id="sprint-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label htmlFor="sprint-end">{t('sprintEnd')}</label>
          <input id="sprint-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label htmlFor="sprint-status">{t('sprintStatus')}</label>
          <select id="sprint-status" value={status} onChange={(e) => setStatus(e.target.value as SprintStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`sprint_${s}`)}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="field-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose} disabled={saving}>
            {t('cancel')}
          </button>
          <button type="submit" disabled={saving}>
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
