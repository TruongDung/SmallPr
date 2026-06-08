# Frontend Modules

`public/app.js` is the page-level orchestrator: it wires DOM elements, app state, API calls, and feature modules together.

Feature-specific behavior should live in focused modules under `public/js/`:

- `richText.js` owns rich-text sanitizing, rendering, checklist behavior, and editor toolbar setup.
- `features/tasks/relatedTasks.module.js` owns the related-task picker for task edit/detail modals.
- `tasks.js` owns shared task formatting, status/priority helpers, recurrence helpers, and task search matching.
- `tags/tags.module.js` owns tag list rendering, tag CRUD, the rename/delete modals, and tag autocomplete suggestions. Shared mutable state (the tags array and active tag filter) stays owned by `app.js` and is accessed through getter/setter callbacks.
- `features/*/*.module.js` files own larger feature areas such as notes, dashboard, exports, and credit cards.

When adding new UI behavior, prefer extracting a `window.FeatureModule.create({...dependencies})` module instead of adding another large block to `app.js`.
