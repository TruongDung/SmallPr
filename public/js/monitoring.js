(function () {
  const state = {
    config: null,
    initialized: false,
    userId: null,
  };

  const clampSampleRate = (value, fallback = 0) => {
    const sampleRate = Number(value);
    if (!Number.isFinite(sampleRate)) return fallback;
    return Math.min(1, Math.max(0, sampleRate));
  };

  const loadScript = (src, id, crossOrigin = null) => new Promise((resolve, reject) => {
    if (id && document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    if (id) script.id = id;
    if (crossOrigin) script.crossOrigin = crossOrigin;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.append(script);
  });

  const loadPublicConfig = async () => {
    const response = await fetch('/api/config/public', {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Monitoring config failed (${response.status})`);
    }
    return response.json();
  };

  const initSentry = async (sentryConfig = {}) => {
    if (!sentryConfig.dsn) return;

    await loadScript(
      'https://browser.sentry-cdn.com/8.55.0/bundle.tracing.replay.min.js',
      'sentry-browser-sdk',
      'anonymous'
    );
    if (!window.Sentry?.init) return;

    window.Sentry.init({
      dsn: sentryConfig.dsn,
      environment: sentryConfig.environment || 'development',
      release: sentryConfig.release || undefined,
      tracesSampleRate: clampSampleRate(sentryConfig.tracesSampleRate),
      replaysSessionSampleRate: clampSampleRate(sentryConfig.replaysSessionSampleRate),
      replaysOnErrorSampleRate: clampSampleRate(sentryConfig.replaysOnErrorSampleRate, 1),
    });
  };

  const initPostHog = (posthogConfig = {}) => {
    if (!posthogConfig.apiKey) return;

    window.posthog = window.posthog || [];
    if (!window.posthog.__SV) {
      const posthog = window.posthog;
      posthog._i = [];
      posthog.init = function init(apiKey, options, name) {
        const target = posthog;
        const instanceName = name || 'posthog';
        const methods = 'init capture register register_once unregister identify reset setPersonProperties opt_in_capturing opt_out_capturing has_opted_out_capturing'.split(' ');
        const createStub = (method) => {
          target[method] = function stub() {
            target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
          };
        };
        methods.forEach(createStub);
        target._i.push([apiKey, options, instanceName]);
      };
      posthog.__SV = 1;
    }

    const apiHost = posthogConfig.apiHost || 'https://us.i.posthog.com';
    window.posthog.init(posthogConfig.apiKey, {
      api_host: apiHost,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      loaded: (posthog) => {
        if (state.userId) posthog.identify(state.userId);
      },
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `${apiHost.replace(/\/$/, '')}/static/array.js`;
    document.head.append(script);
  };

  const setUser = (user) => {
    const userId = user?.id ? String(user.id) : null;
    state.userId = userId;

    if (window.Sentry?.setUser) {
      window.Sentry.setUser(userId ? {
        id: userId,
        username: user.username,
        email: user.email || undefined,
      } : null);
    }

    if (window.posthog) {
      if (userId && typeof window.posthog.identify === 'function') {
        window.posthog.identify(userId, {
          username: user.username,
          email: user.email || undefined,
          language: user.language || undefined,
          timezone: user.timezone || undefined,
        });
      } else if (!userId && typeof window.posthog.reset === 'function') {
        window.posthog.reset();
      }
    }
  };

  const captureEvent = (eventName, properties = {}) => {
    if (window.posthog?.capture) {
      window.posthog.capture(eventName, properties);
    }
  };

  const captureError = (error, context = {}) => {
    if (window.Sentry?.captureException) {
      window.Sentry.captureException(error, { extra: context });
    }
  };

  const init = async () => {
    try {
      state.config = await loadPublicConfig();
      await initSentry(state.config.sentry);
      initPostHog(state.config.posthog);
      state.initialized = true;
    } catch (error) {
      console.warn('Monitoring disabled:', error.message);
    }
  };

  window.AppMonitoring = {
    captureError,
    captureEvent,
    init,
    setUser,
  };

  init();
}());
