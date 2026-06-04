import { useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../store/i18n';
import { ApiRequestError } from '../../api/http';

export const LoginForm = () => {
  const { t, language, setLanguage } = useI18n();
  const { login, isLoggingIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!username || !password) {
      setError(t('authRequired'));
      return;
    }
    try {
      await login({ username, password });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('authRequired'));
    }
  };

  return (
    <section id="auth-section" className="auth-section">
      <div className="auth-header">
        <h1>{t('appTitle')}</h1>
        <p>{t('appSubtitle')}</p>
        <label className="language-select">
          {t('language')}:{' '}
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="en">English</option>
            <option value="vi">Tiếng Việt</option>
          </select>
        </label>
      </div>
      <form id="auth-form" className="auth-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="login-username">{t('username')}</label>
          <input
            id="login-username"
            type="text"
            value={username}
            autoComplete="username"
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">{t('password')}</label>
          <div className="password-wrapper">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="secondary"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? t('hidePassword') : t('showPassword')}
            </button>
          </div>
        </div>
        {error && <p className="field-error">{error}</p>}
        <button type="submit" disabled={isLoggingIn}>
          {isLoggingIn ? t('sending') : t('login')}
        </button>
      </form>
    </section>
  );
};
