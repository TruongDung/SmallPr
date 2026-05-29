(function () {
  const createCardTable = ({ elements, formatters, t, getLanguage, onEdit, onDelete }) => {
    let cardSort = { field: 'balance', direction: 'desc' };

    const userGroupKey = (card) => (card.card_user || '').trim() || t('notAvailable');

    const getCardBalance = (card) => formatters.normalizeAmount(card.total_balance);

    const getCardInterestCharge = (card) => formatters.normalizeAmount(card.interest_charge);

    const getCardClosingDateTime = (card) => {
      if (!card.closing_date) return 0;
      const date = new Date(`${card.closing_date}T00:00:00`);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };

    const compareCardsByField = (first, second, field = cardSort.field) => {
      if (field === 'user') {
        return formatters.compareText(userGroupKey(first), userGroupKey(second))
          || formatters.compareText(first.name, second.name);
      }

      if (field === 'issuer') {
        return formatters.compareText(formatters.formatIssuer(first.issuer), formatters.formatIssuer(second.issuer))
          || formatters.compareText(first.name, second.name);
      }

      if (field === 'closingDate') {
        return getCardClosingDateTime(first) - getCardClosingDateTime(second)
          || formatters.compareText(first.name, second.name);
      }

      if (field === 'interestCharge') {
        return getCardInterestCharge(first) - getCardInterestCharge(second)
          || formatters.compareText(first.name, second.name);
      }

      return getCardBalance(first) - getCardBalance(second)
        || formatters.compareText(first.name, second.name);
    };

    const sortCards = (cardsToSort, field = cardSort.field, direction = cardSort.direction) => (
      [...cardsToSort].sort((first, second) => {
        const result = compareCardsByField(first, second, field);
        return direction === 'asc' ? result : -result;
      })
    );

    const groupCardsByUser = (cardsToGroup) => cardsToGroup.reduce((groups, card) => {
      const user = userGroupKey(card);
      const existing = groups.get(user) || { user, total: 0, cards: [] };
      existing.total += getCardBalance(card);
      existing.cards.push(card);
      groups.set(user, existing);
      return groups;
    }, new Map());

    const getSortedCardGroups = (cardsToGroup) => [...groupCardsByUser(cardsToGroup).values()]
      .map((group) => ({
        ...group,
        cards: sortCards(group.cards),
      }))
      .sort((first, second) => {
        if (cardSort.field === 'user') {
          const result = first.user.localeCompare(second.user, getLanguage(), { sensitivity: 'base' });
          return cardSort.direction === 'asc' ? result : -result;
        }

        const totalDifference = second.total - first.total;
        if (totalDifference !== 0) return totalDifference;
        return first.user.localeCompare(second.user, getLanguage(), { sensitivity: 'base' });
      });

    const createSummaryRow = ({ label, total, className }) => {
      const row = document.createElement('tr');
      row.className = className;

      const cell = document.createElement('td');
      cell.colSpan = 6;

      const labelElement = document.createElement('strong');
      labelElement.textContent = label;

      const totalElement = document.createElement('span');
      totalElement.textContent = formatters.formatCurrency(total);

      cell.append(labelElement, totalElement);
      row.append(cell);
      return row;
    };

    const createGrandTotalRow = (cardsToTotal) => createSummaryRow({
      label: 'Total',
      total: cardsToTotal.reduce((sum, card) => sum + getCardBalance(card), 0),
      className: 'credit-card-grand-total',
    });

    const createUserSummaryRow = (group) => createSummaryRow({
      label: group.user,
      total: group.total,
      className: 'credit-card-user-summary',
    });

    const updateSortHeaders = () => {
      document.querySelectorAll('[data-credit-card-sort]').forEach((button) => {
        const isActive = button.dataset.creditCardSort === cardSort.field;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-sort', isActive ? (cardSort.direction === 'asc' ? 'ascending' : 'descending') : 'none');

        const arrow = button.querySelector('.sort-arrow');
        if (arrow) arrow.textContent = isActive ? (cardSort.direction === 'asc' ? '^' : 'v') : '<>';
      });
    };

    const render = (cardsToRender = []) => {
      elements.list.innerHTML = '';

      if (!cardsToRender.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.className = 'credit-card-empty';
        cell.textContent = t('noCreditCards');
        row.append(cell);
        elements.list.append(row);
        updateSortHeaders();
        return;
      }

      getSortedCardGroups(cardsToRender).forEach((group) => {
        elements.list.append(createUserSummaryRow(group));

        group.cards.forEach((card) => {
          const row = document.createElement('tr');

          const nameCell = document.createElement('td');
          nameCell.dataset.label = t('cardName');
          const name = document.createElement('strong');
          name.textContent = card.name;
          nameCell.append(name);

          const issuerCell = document.createElement('td');
          issuerCell.dataset.label = t('creditCardIssuer');
          issuerCell.textContent = formatters.formatIssuer(card.issuer);

          const balanceCell = document.createElement('td');
          balanceCell.dataset.label = t('totalBalance');
          balanceCell.textContent = formatters.formatCurrency(card.total_balance);

          const interestChargeCell = document.createElement('td');
          interestChargeCell.dataset.label = t('interestCharge');
          interestChargeCell.textContent = formatters.formatCurrency(card.interest_charge);

          const closingDateCell = document.createElement('td');
          closingDateCell.dataset.label = t('closingDate');
          closingDateCell.textContent = formatters.formatDateOnly(card.closing_date);

          const actionsCell = document.createElement('td');
          actionsCell.dataset.label = t('actions');
          const actions = document.createElement('div');
          actions.className = 'credit-card-actions';

          const editButton = document.createElement('button');
          editButton.type = 'button';
          editButton.className = 'task-action-icon';
          editButton.textContent = '✎';
          editButton.setAttribute('aria-label', t('edit'));
          editButton.title = t('edit');
          editButton.addEventListener('click', () => onEdit(card));

          const deleteButton = document.createElement('button');
          deleteButton.type = 'button';
          deleteButton.className = 'task-action-icon danger';
          deleteButton.textContent = '×';
          deleteButton.setAttribute('aria-label', t('delete'));
          deleteButton.title = t('delete');
          deleteButton.addEventListener('click', () => {
            if (typeof onDelete === 'function') onDelete(card);
          });

          actions.append(editButton, deleteButton);
          actionsCell.append(actions);
          row.append(nameCell, issuerCell, balanceCell, interestChargeCell, closingDateCell, actionsCell);
          elements.list.append(row);
        });
      });

      elements.list.append(createGrandTotalRow(cardsToRender));

      updateSortHeaders();
    };

    const setSort = (field, cards) => {
      cardSort = {
        field,
        direction: cardSort.field === field && cardSort.direction === 'asc' ? 'desc' : 'asc',
      };
      render(cards);
    };

    const createSortableHeader = (field, label, getCards) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'table-sort-button';
      button.dataset.creditCardSort = field;
      button.addEventListener('click', () => setSort(field, getCards()));

      const text = document.createElement('span');
      text.textContent = label;

      const arrow = document.createElement('span');
      arrow.className = 'sort-arrow';
      arrow.setAttribute('aria-hidden', 'true');

      button.append(text, arrow);
      return button;
    };

    const renderHeaders = (getCards) => {
      const headerCells = document.querySelectorAll('.credit-card-table th');
      const labels = [
        t('cardName'),
        t('creditCardIssuer'),
        t('totalBalance'),
        t('interestCharge'),
        t('closingDate'),
        t('actions'),
      ];
      const sortableHeaders = {
        1: 'issuer',
        2: 'balance',
        3: 'interestCharge',
        4: 'closingDate',
      };

      headerCells.forEach((cell, index) => {
        cell.innerHTML = '';
        if (sortableHeaders[index]) {
          cell.append(createSortableHeader(sortableHeaders[index], labels[index], getCards));
        } else {
          cell.textContent = labels[index];
        }
      });
      updateSortHeaders();
    };

    return {
      render,
      renderHeaders,
    };
  };

  window.CreditCardFeature = {
    ...(window.CreditCardFeature || {}),
    createCardTable,
  };
}());
