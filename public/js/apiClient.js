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
      try {
        return await response.json();
      } catch (error) {
        return { error: `Request failed (${response.status} ${response.statusText || ''})`.trim() };
      }
    };

    return { request };
  };

  window.ApiClient = { create };
})();
