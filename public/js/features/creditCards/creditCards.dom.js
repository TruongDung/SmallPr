(function () {
  const getElements = () => ({
    form: document.getElementById('credit-card-form'),
    nameInput: document.getElementById('credit-card-name'),
    userInput: document.getElementById('credit-card-user'),
    issuerInput: document.getElementById('credit-card-issuer'),
    balanceInput: document.getElementById('credit-card-balance'),
    closingDateInput: document.getElementById('credit-card-closing-date'),
    list: document.getElementById('credit-card-list'),
    message: document.getElementById('credit-card-message'),
    financialTabs: [...document.querySelectorAll('[data-financial-tab]')],
    financialPanels: {
      cards: document.getElementById('credit-card-panel'),
      info: document.getElementById('credit-card-info-panel'),
    },
    fastAccessBillsList: document.getElementById('fast-access-bills-list'),
    fastAccessGrandTotal: document.getElementById('fast-access-grand-total'),
    editBillModal: document.getElementById('edit-fast-access-bill-modal'),
    editBillForm: document.getElementById('edit-fast-access-bill-form'),
    editBillTitle: document.getElementById('edit-fast-access-bill-title'),
    editBillItemInput: document.getElementById('edit-fast-access-bill-item'),
    editBillAmountInput: document.getElementById('edit-fast-access-bill-amount'),
    editBillDueDateInput: document.getElementById('edit-fast-access-bill-due-date'),
    editBillPayBeforeInput: document.getElementById('edit-fast-access-bill-pay-before'),
    editBillStatusInput: document.getElementById('edit-fast-access-bill-status'),
    editBillError: document.getElementById('edit-fast-access-bill-error'),
    cancelEditBillButton: document.getElementById('cancel-edit-fast-access-bill'),
    saveEditBillButton: document.getElementById('save-edit-fast-access-bill'),
    editModal: document.getElementById('edit-credit-card-modal'),
    editForm: document.getElementById('edit-credit-card-form'),
    editTitle: document.getElementById('edit-credit-card-title'),
    editNameInput: document.getElementById('edit-credit-card-name'),
    editUserInput: document.getElementById('edit-credit-card-user'),
    editIssuerInput: document.getElementById('edit-credit-card-issuer'),
    editBalanceInput: document.getElementById('edit-credit-card-balance'),
    editClosingDateInput: document.getElementById('edit-credit-card-closing-date'),
    editError: document.getElementById('edit-credit-card-error'),
    cancelEditButton: document.getElementById('cancel-edit-credit-card'),
    saveEditButton: document.getElementById('save-edit-credit-card'),
  });

  const setText = (selector, text) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = text;
  };

  const setFieldError = (element, text) => {
    if (!element) return;
    element.textContent = text;
    element.classList.remove('hidden');
  };

  const clearFieldError = (element) => {
    if (!element) return;
    element.textContent = '';
    element.classList.add('hidden');
  };

  const setActiveFinancialTab = ({ tabs, panels }, tabName) => {
    const normalizedTabName = panels[tabName] ? tabName : 'cards';

    tabs.forEach((tab) => {
      const isActive = tab.dataset.financialTab === normalizedTabName;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    Object.entries(panels).forEach(([name, panel]) => {
      if (!panel) return;
      panel.classList.toggle('hidden', name !== normalizedTabName);
    });
  };

  window.CreditCardFeature = {
    ...(window.CreditCardFeature || {}),
    dom: {
      clearFieldError,
      getElements,
      setActiveFinancialTab,
      setFieldError,
      setText,
    },
  };
}());
