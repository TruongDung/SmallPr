// HTTP request wrapper for the Task Manager frontend.
// All API calls go through this module.
(function () {
  const create = ({ state }) => {
    const request = async (url, options = {}) => {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });

      const fallbackError = `Request failed (${response.status} ${response.statusText || ''})`.trim();

      if (response.status === 204) {
        return response.ok ? {} : { error: fallbackError };
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (!text.trim()) {
        return response.ok ? {} : { error: fallbackError };
      }

      try {
        const data = JSON.parse(text);
        if (!response.ok && !data.error) {
          data.error = fallbackError;
        }
        return data;
      } catch (error) {
        if (response.ok && !contentType.includes('application/json')) {
          return { error: 'Unexpected server response. Please refresh and try again.' };
        }
        return { error: fallbackError };
      }
    };

    return { request };
  };

  window.ApiClient = { create };
})();
