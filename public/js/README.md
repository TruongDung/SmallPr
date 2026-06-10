# Frontend Modules

`public/app.js` is the page-level orchestrator: it wires DOM elements, app state, API calls, and feature modules together.

Feature-specific behavior should live in focused modules under `public/js/`:

- `richText.js` owns rich-text sanitizing, rendering, checklist behavior, and editor toolbar setup.
- `features/tasks/relatedTasks.module.js` owns the related-task picker for task edit/detail modals.
- `tasks.js` owns shared task formatting, status/priority helpers, recurrence helpers, and task search matching.
- `tags/tags.module.js` owns tag list rendering, tag CRUD, the rename/delete modals, and tag autocomplete suggestions. Shared mutable state (the tags array and active tag filter) stays owned by `app.js` and is accessed through getter/setter callbacks.
- `features/*/*.module.js` files own larger feature areas such as notes, dashboard, exports, and credit cards.

When adding new UI behavior, prefer extracting a `window.FeatureModule.create({...dependencies})` module instead of adding another large block to `app.js`.

## The module factory pattern

Every module is an IIFE that registers a factory on `window`. Dependencies are
**injected by `app.js`, never imported** — a module only knows what it is given:

```js
(function () {
  const create = ({
    request,          // authenticated fetch wrapper
    t,                // i18n translate function
    showStatusToast,  // toast helper
    // ...whatever this feature needs
  }) => {
    // ---- DOM refs (owned by this module) ----
    const container = document.getElementById('my-feature-container');

    // ---- State (owned by this module) ----
    let items = [];

    // ---- Private helpers ----
    const load = async () => {
      items = await request('/api/my-feature');
      render();
    };
    const render = () => { /* ... */ };

    // ---- Public API ----
    return { load, render };
  };

  window.MyFeatureModule = { create };
})();
```

`public/js/features/admin/admin.module.js` is a complete real-world example.

## Script load order

Load order is the **script-tag order in `public/index.html`** (bottom of the file):

1. CDN libraries (xlsx, jspdf, docx)
2. Shared infrastructure: `utils.js` → `state.js` → `apiClient.js` → `ui/toast.js` → `richText.js`
3. Feature modules (`features/*`, `tasks.js`, `weather.js`, `tags/`, `transactions.module.js`, ...)
4. `socket.io.js`, `monitoring.js`, `i18n.js`
5. `app.js` **last** — it expects every `window.*Module` to already exist

## Cache busting — do not skip this

Every script tag carries a `?v=cache-clear-...` query param:

```html
<script src="js/features/notes/notes.module.js?v=cache-clear-20260608-note-cursor-end-1"></script>
```

When you edit a JS file, **bump its `?v=` param in `index.html`** (any new
unique string works; convention is `cache-clear-<date>-<slug>-<n>`). If you
forget, browsers keep serving the stale cached file and your change "doesn't
work".

## Adding a new module — checklist

1. Create `public/js/features/<name>/<name>.module.js` with the IIFE/factory shape above.
2. Add a `<script>` tag for it in `public/index.html`, **before** `app.js`, with a fresh `?v=` param.
3. In `app.js`, call `window.<Name>Module.create({ ...deps })` and pass exactly the helpers the module needs.
4. Keep shared mutable state in `app.js`, exposed to the module via getter/setter callbacks (see `tags.module.js` for the pattern).
