(function () {
  const create = ({ request, t, showStatusToast, getLanguage }) => {
    const form = document.getElementById('credit-card-form');
    const nameInput = document.getElementById('credit-card-name');
    const userInput = document.getElementById('credit-card-user');
    const issuerInput = document.getElementById('credit-card-issuer');
    const balanceInput = document.getElementById('credit-card-balance');
    const closingDateInput = document.getElementById('credit-card-closing-date');
    const list = document.getElementById('credit-card-list');
    const message = document.getElementById('credit-card-message');
    const financialTabs = [...document.querySelectorAll('[data-financial-tab]')];
    const financialPanels = {
      cards: document.getElementById('credit-card-panel'),
      info: document.getElementById('credit-card-info-panel'),
    };
    const fastAccessBillsList = document.getElementById('fast-access-bills-list');
    const fastAccessTotalWithoutRent = document.getElementById('fast-access-total-without-rent');
    const fastAccessRentAmount = document.getElementById('fast-access-rent-amount');
    const fastAccessGrandTotal = document.getElementById('fast-access-grand-total');
    const editBillModal = document.getElementById('edit-fast-access-bill-modal');
    const editBillForm = document.getElementById('edit-fast-access-bill-form');
    const editBillTitle = document.getElementById('edit-fast-access-bill-title');
    const editBillItemInput = document.getElementById('edit-fast-access-bill-item');
    const editBillAmountInput = document.getElementById('edit-fast-access-bill-amount');
    const editBillDueDateInput = document.getElementById('edit-fast-access-bill-due-date');
    const editBillPayBeforeInput = document.getElementById('edit-fast-access-bill-pay-before');
    const editBillStatusInput = document.getElementById('edit-fast-access-bill-status');
    const editBillError = document.getElementById('edit-fast-access-bill-error');
    const cancelEditBillButton = document.getElementById('cancel-edit-fast-access-bill');
    const saveEditBillButton = document.getElementById('save-edit-fast-access-bill');
    const editModal = document.getElementById('edit-credit-card-modal');
    const editForm = document.getElementById('edit-credit-card-form');
    const editTitle = document.getElementById('edit-credit-card-title');
    const editNameInput = document.getElementById('edit-credit-card-name');
    const editUserInput = document.getElementById('edit-credit-card-user');
    const editIssuerInput = document.getElementById('edit-credit-card-issuer');
    const editBalanceInput = document.getElementById('edit-credit-card-balance');
    const editClosingDateInput = document.getElementById('edit-credit-card-closing-date');
    const editError = document.getElementById('edit-credit-card-error');
    const cancelEditButton = document.getElementById('cancel-edit-credit-card');
    const saveEditButton = document.getElementById('save-edit-credit-card');
    let cards = [];
    let cardUsers = [];
    let fastAccessBills = [];
    let pendingEditCard = null;
    let pendingEditBill = null;

    const setText = (selector, text) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = text;
    };

    const translateQuickLinks = () => {
      document.querySelectorAll('.credit-card-link[data-i18n-key]').forEach((link) => {
        link.textContent = t(link.dataset.i18nKey);
      });
    };

    const setActiveFinancialTab = (tabName) => {
      const normalizedTabName = financialPanels[tabName] ? tabName : 'cards';

      financialTabs.forEach((tab) => {
        const isActive = tab.dataset.financialTab === normalizedTabName;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });

      Object.entries(financialPanels).forEach(([name, panel]) => {
        if (!panel) return;
        panel.classList.toggle('hidden', name !== normalizedTabName);
      });
    };

    const showEditError = (text) => {
      editError.textContent = text;
      editError.classList.remove('hidden');
    };

    const clearEditError = () => {
      editError.textContent = '';
      editError.classList.add('hidden');
    };

    const showEditBillError = (text) => {
      editBillError.textContent = text;
      editBillError.classList.remove('hidden');
    };

    const clearEditBillError = () => {
      editBillError.textContent = '';
      editBillError.classList.add('hidden');
    };

    const formatCurrency = (value) => {
      const amount = Number(value || 0);
      return new Intl.NumberFormat(getLanguage() === 'vi' ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number.isFinite(amount) ? amount : 0);
    };

    const formatDateOnly = (dateString) => {
      if (!dateString) return t('notAvailable');
      const date = new Date(`${dateString}T00:00:00`);
      if (Number.isNaN(date.getTime())) return t('notAvailable');
      return date.toLocaleDateString(getLanguage() === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const issuerLabels = {
      citi: 'Citi',
      amex: 'Amex',
      discover: 'Discover',
      boa: 'BOA',
      chase: 'Chase',
      capital_one: 'Capital One',
      wells_fargo: 'Wells Fargo',
      other: 'Other',
    };

    const formatIssuer = (issuer) => issuerLabels[issuer] || t('notAvailable');

    const userGroupKey = (card) => (card.card_user || '').trim() || t('notAvailable');

    const excludedCardUserNames = new Set(['admin', 'card holder']);

    const isAllowedCardUser = (name) => {
      const normalizedName = String(name || '').trim().toLowerCase();
      return normalizedName && !excludedCardUserNames.has(normalizedName);
    };

    const mergeCardUsers = (savedUsers = [], cardsToMerge = cards) => {
      const names = [
        ...savedUsers,
        ...cardsToMerge.map((card) => card.card_user),
      ]
        .map((name) => String(name || '').trim())
        .filter(isAllowedCardUser);

      return [...new Set(names)].sort((first, second) => (
        first.localeCompare(second, getLanguage(), { sensitivity: 'base' })
      ));
    };

    const setUserOptions = (select, selectedValue = '') => {
      if (!select) return;

      const normalizedSelectedValue = String(selectedValue || '').trim();
      const optionValues = isAllowedCardUser(normalizedSelectedValue) && !cardUsers.includes(normalizedSelectedValue)
        ? [normalizedSelectedValue, ...cardUsers]
        : cardUsers;

      select.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = t('creditCardUserPlaceholder');
      select.append(placeholder);

      optionValues.forEach((user) => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        select.append(option);
      });

      select.value = isAllowedCardUser(normalizedSelectedValue) ? normalizedSelectedValue : '';
    };

    const groupCardsByUser = (cardsToGroup) => cardsToGroup.reduce((groups, card) => {
      const user = userGroupKey(card);
      const existing = groups.get(user) || { user, total: 0, cards: [] };
      const amount = Number(card.total_balance || 0);
      existing.total += Number.isFinite(amount) ? amount : 0;
      existing.cards.push(card);
      groups.set(user, existing);
      return groups;
    }, new Map());

    const createSummaryRow = ({ label, total, className }) => {
      const row = document.createElement('tr');
      row.className = className;

      const cell = document.createElement('td');
      cell.colSpan = 6;

      const labelElement = document.createElement('strong');
      labelElement.textContent = label;

      const totalElement = document.createElement('span');
      totalElement.textContent = formatCurrency(total);

      cell.append(labelElement, totalElement);
      row.append(cell);
      return row;
    };

    const createUserSummaryRow = (group) => createSummaryRow({
      label: group.user,
      total: group.total,
      className: 'credit-card-user-summary',
    });

    const createGrandTotalRow = (cardsToTotal) => {
      const total = cardsToTotal.reduce((sum, card) => {
        const amount = Number(card.total_balance || 0);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);

      return createSummaryRow({
        label: 'Total',
        total,
        className: 'credit-card-grand-total',
      });
    };

    const formatBalanceInput = (value) => {
      const amount = Number(value || 0);
      return Number.isFinite(amount) ? amount.toFixed(2) : '';
    };

    const normalizeBillAmount = (value) => {
      const amount = Number(value || 0);
      return Number.isFinite(amount) ? amount : 0;
    };

    const updateFastAccessTotals = () => {
      const rentBill = fastAccessBills.find((bill) => Number(bill.sort_order) === 1)
        || fastAccessBills.find((bill) => String(bill.item || '').trim().toLowerCase() === 'rent');
      const rentAmount = rentBill ? normalizeBillAmount(rentBill.amount) : 0;
      const totalWithoutRent = fastAccessBills.reduce((sum, bill) => {
        if (rentBill && bill.id === rentBill.id) return sum;
        return sum + normalizeBillAmount(bill.amount);
      }, 0);

      if (fastAccessTotalWithoutRent) fastAccessTotalWithoutRent.textContent = formatCurrency(totalWithoutRent);
      if (fastAccessRentAmount) fastAccessRentAmount.textContent = formatCurrency(rentAmount);
      if (fastAccessGrandTotal) fastAccessGrandTotal.textContent = formatCurrency(totalWithoutRent + rentAmount);
    };

    const updateFastAccessBill = async (bill, updates, { showModalError = false } = {}) => {
      const nextBill = { ...bill, ...updates };
      const result = await request(`/api/credit-cards/fast-access-bills/${bill.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          item: nextBill.item,
          amount: nextBill.amount,
          due_date: nextBill.due_date,
          pay_before: nextBill.pay_before,
          status: nextBill.status,
        }),
      });

      if (result.error) {
        if (showModalError) {
          showEditBillError(result.error);
        } else {
          message.textContent = result.error;
        }
        renderFastAccessBills();
        return null;
      }

      fastAccessBills = fastAccessBills.map((savedBill) => (
        savedBill.id === bill.id ? result.bill : savedBill
      ));
      message.textContent = '';
      renderFastAccessBills();
      return result.bill;
    };

    const openEditBillModal = (bill) => {
      pendingEditBill = bill;
      clearEditBillError();
      editBillForm.reset();
      editBillItemInput.value = bill.item || '';
      editBillAmountInput.value = formatBalanceInput(bill.amount);
      editBillDueDateInput.value = bill.due_date || '';
      editBillPayBeforeInput.value = bill.pay_before || '';
      editBillStatusInput.value = bill.status || 'Unpaid';
      editBillModal.classList.remove('hidden');
      editBillItemInput.focus();
      editBillItemInput.select();
    };

    const closeEditBillModal = () => {
      pendingEditBill = null;
      clearEditBillError();
      editBillForm.reset();
      editBillModal.classList.add('hidden');
    };

    const updateBillFromModal = async () => {
      if (!pendingEditBill) return;
      clearEditBillError();
      message.textContent = '';

      const item = editBillItemInput.value.trim();
      if (!item) {
        showEditBillError(t('billItemRequired'));
        editBillItemInput.focus();
        return;
      }

      const amount = editBillAmountInput.value.trim();
      if (amount && !Number.isFinite(Number(amount))) {
        showEditBillError(t('invalidBillAmount'));
        editBillAmountInput.focus();
        return;
      }

      const updatedBill = await updateFastAccessBill(pendingEditBill, {
        item,
        amount: Number(amount || 0),
        due_date: editBillDueDateInput.value.trim(),
        pay_before: editBillPayBeforeInput.value.trim(),
        status: editBillStatusInput.value,
      }, { showModalError: true });

      if (updatedBill) closeEditBillModal();
    };

    const renderFastAccessBills = () => {
      if (!fastAccessBillsList) return;

      fastAccessBillsList.innerHTML = '';
      fastAccessBills.forEach((bill) => {
        const row = document.createElement('tr');

        const itemCell = document.createElement('td');
        itemCell.dataset.label = t('billItem');
        const item = document.createElement('strong');
        item.textContent = bill.item || t('notAvailable');
        itemCell.append(item);

        const amountCell = document.createElement('td');
        amountCell.dataset.label = t('amount');
        amountCell.textContent = formatCurrency(bill.amount);

        const dueDateCell = document.createElement('td');
        dueDateCell.dataset.label = t('dueDate');
        dueDateCell.textContent = bill.due_date || t('notAvailable');

        const payBeforeCell = document.createElement('td');
        payBeforeCell.dataset.label = t('payBefore');
        payBeforeCell.textContent = bill.pay_before || t('notAvailable');

        const statusCell = document.createElement('td');
        statusCell.dataset.label = t('status');
        statusCell.textContent = bill.status || t('notAvailable');

        const actionsCell = document.createElement('td');
        actionsCell.dataset.label = t('actions');
        const actions = document.createElement('div');
        actions.className = 'credit-card-actions';
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'secondary';
        editButton.textContent = t('edit');
        editButton.addEventListener('click', () => openEditBillModal(bill));
        actions.append(editButton);
        actionsCell.append(actions);

        row.append(itemCell, amountCell, dueDateCell, payBeforeCell, statusCell, actionsCell);
        fastAccessBillsList.append(row);
      });

      updateFastAccessTotals();
    };

    const openEditModal = (card) => {
      pendingEditCard = card;
      clearEditError();
      editForm.reset();
      editNameInput.value = card.name || '';
      setUserOptions(editUserInput, card.card_user || '');
      editIssuerInput.value = card.issuer || '';
      editBalanceInput.value = formatBalanceInput(card.total_balance);
      editClosingDateInput.value = card.closing_date || '';
      editModal.classList.remove('hidden');
      editNameInput.focus();
      editNameInput.select();
    };

    const closeEditModal = () => {
      pendingEditCard = null;
      clearEditError();
      editForm.reset();
      editModal.classList.add('hidden');
    };

    const updateCard = async () => {
      if (!pendingEditCard) return;
      clearEditError();
      message.textContent = '';

      const name = editNameInput.value.trim();
      if (!name) {
        showEditError(t('creditCardNameRequired'));
        editNameInput.focus();
        return;
      }

      const result = await request(`/api/credit-cards/${pendingEditCard.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          card_user: editUserInput.value,
          issuer: editIssuerInput.value,
          total_balance: editBalanceInput.value,
          closing_date: editClosingDateInput.value,
        }),
      });

      if (result.error) {
        showEditError(result.error);
        return;
      }

      closeEditModal();
      showStatusToast(t('creditCardUpdated'));
      load();
    };

    const render = (cardsToRender = cards) => {
      list.innerHTML = '';

      if (!cardsToRender.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.className = 'credit-card-empty';
        cell.textContent = t('noCreditCards');
        row.append(cell);
        list.append(row);
        return;
      }

      list.append(createGrandTotalRow(cardsToRender));

      groupCardsByUser(cardsToRender).forEach((group) => {
        list.append(createUserSummaryRow(group));

        group.cards.forEach((card) => {
          const row = document.createElement('tr');

          const nameCell = document.createElement('td');
          nameCell.dataset.label = t('cardName');
          const name = document.createElement('strong');
          name.textContent = card.name;
          nameCell.append(name);

          const userCell = document.createElement('td');
          userCell.dataset.label = t('creditCardUser');
          userCell.textContent = card.card_user || t('notAvailable');

          const issuerCell = document.createElement('td');
          issuerCell.dataset.label = t('creditCardIssuer');
          issuerCell.textContent = formatIssuer(card.issuer);

          const balanceCell = document.createElement('td');
          balanceCell.dataset.label = t('totalBalance');
          balanceCell.textContent = formatCurrency(card.total_balance);

          const closingDateCell = document.createElement('td');
          closingDateCell.dataset.label = t('closingDate');
          closingDateCell.textContent = formatDateOnly(card.closing_date);

          const actionsCell = document.createElement('td');
          actionsCell.dataset.label = t('actions');
          const actions = document.createElement('div');
          actions.className = 'credit-card-actions';
          const editButton = document.createElement('button');
          editButton.type = 'button';
          editButton.className = 'secondary';
          editButton.textContent = t('edit');
          editButton.addEventListener('click', () => openEditModal(card));
          actions.append(editButton);
          actionsCell.append(actions);

          row.append(nameCell, userCell, issuerCell, balanceCell, closingDateCell, actionsCell);
          list.append(row);
        });
      });
    };

    const load = async () => {
      const [cardsResult, usersResult, fastAccessBillsResult] = await Promise.all([
        request('/api/credit-cards'),
        request('/api/credit-cards/users'),
        request('/api/credit-cards/fast-access-bills'),
      ]);

      if (cardsResult.error) {
        message.textContent = cardsResult.error;
        return;
      }

      if (usersResult.error) {
        message.textContent = usersResult.error;
        return;
      }

      if (fastAccessBillsResult.error) {
        message.textContent = fastAccessBillsResult.error;
        return;
      }

      cards = cardsResult.cards || [];
      fastAccessBills = fastAccessBillsResult.bills || [];
      cardUsers = mergeCardUsers(usersResult.users || [], cards);
      setUserOptions(userInput, userInput.value);
      setUserOptions(editUserInput, editUserInput.value);
      message.textContent = '';
      render(cards);
      renderFastAccessBills();
    };

    const handleSubmit = async (event) => {
      event.preventDefault();
      message.textContent = '';

      const name = nameInput.value.trim();
      if (!name) {
        message.textContent = t('creditCardNameRequired');
        nameInput.focus();
        return;
      }

      const result = await request('/api/credit-cards', {
        method: 'POST',
        body: JSON.stringify({
          name,
          card_user: userInput.value,
          issuer: issuerInput.value,
          total_balance: balanceInput.value,
          closing_date: closingDateInput.value,
        }),
      });

      if (result.error) {
        message.textContent = result.error;
        return;
      }

      form.reset();
      setUserOptions(userInput);
      showStatusToast(t('creditCardAdded'));
      load();
    };

    const applyTranslations = () => {
      setText('#credit-card-title', t('creditCardAccounts'));
      setText('#credit-card-tab', t('creditCardSubTab'));
      setText('#credit-card-info-tab', t('creditCardInfoSubTab'));
      setText('#credit-card-quick-links-title', t('fastAccessLinks'));
      setText('#fast-access-bills-title', t('monthlyBills'));
      setText('.fast-access-bills-table th:nth-child(1)', t('billItem'));
      setText('.fast-access-bills-table th:nth-child(2)', t('amount'));
      setText('.fast-access-bills-table th:nth-child(3)', t('dueDate'));
      setText('.fast-access-bills-table th:nth-child(4)', t('payBefore'));
      setText('.fast-access-bills-table th:nth-child(5)', t('status'));
      setText('.fast-access-bills-table th:nth-child(6)', t('actions'));
      setText('#fast-access-total-without-rent-label', t('totalWithoutRent'));
      setText('#fast-access-rent-amount-label', t('rentAmount'));
      setText('#fast-access-grand-total-label', t('grandTotalIncludingRent'));
      translateQuickLinks();
      setText('label[for="credit-card-name"]', t('cardName'));
      nameInput.placeholder = t('cardNamePlaceholder');
      setText('label[for="credit-card-user"]', t('creditCardUser'));
      setUserOptions(userInput, userInput.value);
      setText('label[for="credit-card-issuer"]', t('creditCardIssuer'));
      setText('label[for="credit-card-balance"]', t('totalBalance'));
      setText('label[for="credit-card-closing-date"]', t('closingDate'));
      setText('#add-credit-card', t('addCard'));
      setText('.credit-card-table th:nth-child(1)', t('cardName'));
      setText('.credit-card-table th:nth-child(2)', t('creditCardUser'));
      setText('.credit-card-table th:nth-child(3)', t('creditCardIssuer'));
      setText('.credit-card-table th:nth-child(4)', t('totalBalance'));
      setText('.credit-card-table th:nth-child(5)', t('closingDate'));
      setText('.credit-card-table th:nth-child(6)', t('actions'));
      if (editTitle) editTitle.textContent = t('editCreditCard');
      setText('label[for="edit-credit-card-name"]', t('cardName'));
      editNameInput.placeholder = t('cardNamePlaceholder');
      setText('label[for="edit-credit-card-user"]', t('creditCardUser'));
      setUserOptions(editUserInput, editUserInput.value);
      setText('label[for="edit-credit-card-issuer"]', t('creditCardIssuer'));
      setText('label[for="edit-credit-card-balance"]', t('totalBalance'));
      setText('label[for="edit-credit-card-closing-date"]', t('closingDate'));
      if (cancelEditButton) cancelEditButton.textContent = t('cancel');
      if (saveEditButton) saveEditButton.textContent = t('save');
      if (editBillTitle) editBillTitle.textContent = t('editBill');
      setText('label[for="edit-fast-access-bill-item"]', t('billItem'));
      setText('label[for="edit-fast-access-bill-amount"]', t('amount'));
      setText('label[for="edit-fast-access-bill-due-date"]', t('dueDate'));
      setText('label[for="edit-fast-access-bill-pay-before"]', t('payBefore'));
      setText('label[for="edit-fast-access-bill-status"]', t('status'));
      if (cancelEditBillButton) cancelEditBillButton.textContent = t('cancel');
      if (saveEditBillButton) saveEditBillButton.textContent = t('save');
      render();
      renderFastAccessBills();
    };

    const bind = () => {
      financialTabs.forEach((tab) => {
        tab.addEventListener('click', () => setActiveFinancialTab(tab.dataset.financialTab));
      });
      setActiveFinancialTab('cards');
      form.addEventListener('submit', handleSubmit);
      editForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await updateCard();
      });
      editBillForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await updateBillFromModal();
      });
      cancelEditButton.addEventListener('click', closeEditModal);
      cancelEditBillButton.addEventListener('click', closeEditBillModal);
      editModal.addEventListener('click', (event) => {
        if (event.target === editModal) closeEditModal();
      });
      editBillModal.addEventListener('click', (event) => {
        if (event.target === editBillModal) closeEditBillModal();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !editModal.classList.contains('hidden')) {
          closeEditModal();
        }
        if (event.key === 'Escape' && !editBillModal.classList.contains('hidden')) {
          closeEditBillModal();
        }
      });
    };

    return {
      applyTranslations,
      bind,
      load,
      render,
    };
  };

  window.CreditCardModule = { create };
}());
