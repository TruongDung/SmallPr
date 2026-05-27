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
    let pendingEditCard = null;

    const setText = (selector, text) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = text;
    };

    const showEditError = (text) => {
      editError.textContent = text;
      editError.classList.remove('hidden');
    };

    const clearEditError = () => {
      editError.textContent = '';
      editError.classList.add('hidden');
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

    const mergeCardUsers = (savedUsers = [], cardsToMerge = cards) => {
      const names = [
        ...savedUsers,
        ...cardsToMerge.map((card) => card.card_user),
      ]
        .map((name) => String(name || '').trim())
        .filter(Boolean);

      return [...new Set(names)].sort((first, second) => (
        first.localeCompare(second, getLanguage(), { sensitivity: 'base' })
      ));
    };

    const setUserOptions = (select, selectedValue = '') => {
      if (!select) return;

      const normalizedSelectedValue = String(selectedValue || '').trim();
      const optionValues = normalizedSelectedValue && !cardUsers.includes(normalizedSelectedValue)
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

      select.value = normalizedSelectedValue;
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
      const [cardsResult, usersResult] = await Promise.all([
        request('/api/credit-cards'),
        request('/api/credit-cards/users'),
      ]);

      if (cardsResult.error) {
        message.textContent = cardsResult.error;
        return;
      }

      if (usersResult.error) {
        message.textContent = usersResult.error;
        return;
      }

      cards = cardsResult.cards || [];
      cardUsers = mergeCardUsers(usersResult.users || [], cards);
      setUserOptions(userInput, userInput.value);
      setUserOptions(editUserInput, editUserInput.value);
      message.textContent = '';
      render(cards);
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
      render();
    };

    const bind = () => {
      form.addEventListener('submit', handleSubmit);
      editForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await updateCard();
      });
      cancelEditButton.addEventListener('click', closeEditModal);
      editModal.addEventListener('click', (event) => {
        if (event.target === editModal) closeEditModal();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !editModal.classList.contains('hidden')) {
          closeEditModal();
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
