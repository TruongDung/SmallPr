import { useEffect, useState } from 'react';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../hooks/useAuth';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useT } from '../../store/i18n';
import type { UserSettings } from '../../api/types';

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

const DEFAULT_SETTINGS: UserSettings = {
  enable_lunar_reminder: false,
  reminder_days_before: 3,
  remind_lunar_day1: true,
  remind_lunar_day15: true,
  show_lunar_dates_in_calendar: true,
};

export const LunarReminderSettings = () => {
  const t = useT();
  const { showToast } = useToast();
  const { user, updateProfile, isUpdatingProfile } = useAuth();
  const { settings, isLoading, error, saveSettings, isSaving } = useUserSettings();
  const [draft, setDraft] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [timezoneDraft, setTimezoneDraft] = useState(DEFAULT_TIMEZONE);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  useEffect(() => {
    setTimezoneDraft(user?.timezone || DEFAULT_TIMEZONE);
  }, [user?.timezone]);

  const updateDraft = (patch: Partial<UserSettings>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSave = async () => {
    setFormError(null);

    if (draft.enable_lunar_reminder && !draft.remind_lunar_day1 && !draft.remind_lunar_day15) {
      setFormError(t('lunarReminderDateRequired'));
      return;
    }

    const timezone = timezoneDraft.trim() || DEFAULT_TIMEZONE;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch (_error) {
      setFormError(t('timezoneInvalid'));
      return;
    }

    try {
      await Promise.all([
        saveSettings(draft),
        updateProfile({
          name: user?.name || '',
          email: user?.email || '',
          timezone,
          language: user?.language || '',
        }),
      ]);
      showToast(t('settingsSaved'));
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : t('saveFailed'));
    }
  };

  const isSavingChanges = isSaving || isUpdatingProfile;

  if (isLoading) {
    return (
      <p className="loading-state" aria-busy="true">
        {t('loading')}
      </p>
    );
  }

  if (error) {
    return <p className="field-error">{t('dashboardErrorTitle')}</p>;
  }

  return (
    <section className="settings-panel" aria-labelledby="lunar-settings-title">
      <header className="settings-panel-header">
        <h2 id="lunar-settings-title">{t('lunarReminderSettings')}</h2>
      </header>

      <div className="settings-fields">
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={draft.enable_lunar_reminder}
            onChange={(event) => updateDraft({ enable_lunar_reminder: event.target.checked })}
          />
          <span>{t('enableLunarReminders')}</span>
        </label>

        <label className="settings-number-field">
          <span>{t('reminderDaysBefore')}</span>
          <input
            type="number"
            min={0}
            max={30}
            value={draft.reminder_days_before}
            onChange={(event) =>
              updateDraft({
                reminder_days_before: Number(event.target.value),
              })
            }
          />
        </label>

        <label className="settings-number-field">
          <span>{t('timezone')}</span>
          <input
            type="text"
            list="lunar-timezones"
            value={timezoneDraft}
            onChange={(event) => setTimezoneDraft(event.target.value)}
            placeholder={DEFAULT_TIMEZONE}
          />
          <datalist id="lunar-timezones">
            <option value="Asia/Ho_Chi_Minh" />
            <option value="America/New_York" />
            <option value="America/Los_Angeles" />
            <option value="UTC" />
          </datalist>
        </label>

        <fieldset className="settings-fieldset">
          <legend>{t('importantDates')}</legend>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={draft.remind_lunar_day1}
              onChange={(event) => updateDraft({ remind_lunar_day1: event.target.checked })}
            />
            <span>{t('lunarDay1')}</span>
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={draft.remind_lunar_day15}
              onChange={(event) => updateDraft({ remind_lunar_day15: event.target.checked })}
            />
            <span>{t('lunarDay15')}</span>
          </label>
        </fieldset>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={draft.show_lunar_dates_in_calendar}
            onChange={(event) =>
              updateDraft({
                show_lunar_dates_in_calendar: event.target.checked,
              })
            }
          />
          <span>{t('showLunarDatesInCalendar')}</span>
        </label>
      </div>

      {formError && <p className="field-error">{formError}</p>}

      <div className="settings-actions">
        <button type="button" onClick={handleSave} disabled={isSavingChanges}>
          {isSavingChanges ? t('saving') : t('save')}
        </button>
      </div>
    </section>
  );
};
