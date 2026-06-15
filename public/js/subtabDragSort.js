// Drag-and-drop reordering for the task sub-tabs.
// Persists the tab order in localStorage so it sticks across sessions.
(function () {
  const STORAGE_KEY = 'taskSubtabOrder';
  const nav = document.getElementById('task-subtab-nav');
  if (!nav) return;

  // Restore saved order on load
  const restoreOrder = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const order = JSON.parse(saved);
      if (!Array.isArray(order)) return;
      const tabs = [...nav.querySelectorAll('[data-task-tab]')];
      const tabMap = new Map(tabs.map((tab) => [tab.dataset.taskTab, tab]));
      // Re-append in saved order; any new tabs not in saved order go to the end
      order.forEach((key) => {
        const tab = tabMap.get(key);
        if (tab) {
          nav.append(tab);
          tabMap.delete(key);
        }
      });
      // Append remaining tabs not in saved order
      tabMap.forEach((tab) => nav.append(tab));
    } catch (_error) {
      // Ignore corrupted data
    }
  };

  const saveOrder = () => {
    const tabs = [...nav.querySelectorAll('[data-task-tab]')];
    const order = tabs.map((tab) => tab.dataset.taskTab);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  };

  // Drag state
  let draggedTab = null;

  const handleDragStart = (event) => {
    draggedTab = event.currentTarget;
    draggedTab.classList.add('subtab-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedTab.dataset.taskTab);
  };

  const handleDragEnd = () => {
    if (draggedTab) {
      draggedTab.classList.remove('subtab-dragging');
      draggedTab = null;
    }
    nav.querySelectorAll('.subtab-drag-over').forEach((el) => {
      el.classList.remove('subtab-drag-over');
    });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const target = event.currentTarget;
    if (!draggedTab || target === draggedTab) return;

    // Determine if we should insert before or after
    const rect = target.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    if (event.clientX < midX) {
      nav.insertBefore(draggedTab, target);
    } else {
      nav.insertBefore(draggedTab, target.nextSibling);
    }
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    const target = event.currentTarget;
    if (target !== draggedTab) {
      target.classList.add('subtab-drag-over');
    }
  };

  const handleDragLeave = (event) => {
    event.currentTarget.classList.remove('subtab-drag-over');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.currentTarget.classList.remove('subtab-drag-over');
    saveOrder();
  };

  // Bind events to all tabs
  const bindTabs = () => {
    const tabs = nav.querySelectorAll('[data-task-tab]');
    tabs.forEach((tab) => {
      tab.draggable = true;
      tab.addEventListener('dragstart', handleDragStart);
      tab.addEventListener('dragend', handleDragEnd);
      tab.addEventListener('dragover', handleDragOver);
      tab.addEventListener('dragenter', handleDragEnter);
      tab.addEventListener('dragleave', handleDragLeave);
      tab.addEventListener('drop', handleDrop);
    });
  };

  restoreOrder();
  bindTabs();
})();
