// Toast notifications and upload progress UI.
(function () {
  const create = ({ state, t = (key) => key }) => {
    const statusToast = document.getElementById('status-toast');
    const uploadProgressOverlay = document.getElementById('upload-progress-overlay');
    const uploadProgressTitle = document.getElementById('upload-progress-title');
    const uploadProgressText = document.getElementById('upload-progress-text');
    const uploadProgressFill = document.getElementById('upload-progress-fill');
    const uploadProgressPercent = document.getElementById('upload-progress-percent');
    const appContainer = document.querySelector('.container');

    const hideStatusToast = () => {
      statusToast.classList.add('hidden');
    };

    const showStatusToast = (message, tone = 'success', options = {}) => {
      if (state.statusToastTimer) {
        clearTimeout(state.statusToastTimer);
        state.statusToastTimer = null;
      }

      statusToast.textContent = message;
      statusToast.classList.toggle('status-toast-error', tone === 'error');
      statusToast.classList.remove('hidden');
      if (options.persist) {
        return;
      }
      state.statusToastTimer = setTimeout(() => {
        hideStatusToast();
        state.statusToastTimer = null;
      }, tone === 'error' ? 3500 : 2000);
    };

    const setUploadProgress = (percent, message = t('uploadPleaseWait')) => {
      const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
      uploadProgressText.textContent = message;
      uploadProgressFill.style.width = `${safePercent}%`;
      uploadProgressPercent.textContent = `${safePercent}%`;
    };

    const showUploadProgress = () => {
      uploadProgressTitle.textContent = t('uploadingFile');
      setUploadProgress(0);
      appContainer.inert = true;
      appContainer.setAttribute('aria-busy', 'true');
      uploadProgressOverlay.classList.remove('hidden');
      document.body.classList.add('is-uploading');
    };

    const hideUploadProgress = () => {
      uploadProgressOverlay.classList.add('hidden');
      appContainer.inert = false;
      appContainer.removeAttribute('aria-busy');
      document.body.classList.remove('is-uploading');
      setUploadProgress(0);
    };

    const registerServiceWorker = () => {
      if (!('serviceWorker' in navigator) || !window.isSecureContext) {
        return;
      }
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
          console.warn('Service worker registration failed:', error);
        });
      });
    };

    return {
      hideStatusToast,
      showStatusToast,
      setUploadProgress,
      showUploadProgress,
      hideUploadProgress,
      registerServiceWorker,
    };
  };

  window.ToastModule = { create };
})();
