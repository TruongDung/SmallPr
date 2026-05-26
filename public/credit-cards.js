(function () {
  const create = ({ request, t, showStatusToast, getLanguage }) => {
    const form = document.getElementById('credit-card-form');
    const nameInput = document.getElementById('credit-card-name');
    const balanceInput = document.getElementById('credit-card-balance');
    const closingDateInput = document.getElementById('credit-card-closing-date');
    const list = document.getElementById('credit-card-list');
    const message = document.getElementById('credit-card-message');
    let cards = [];

    const setText = (selector, text) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = text;
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

    const updateClosingDate = async (id, closingDate) => {
      message.textContent = '';
      const result = await request(`/api/credit-cards/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ closing_date: closingDate }),
      });

      if (result.error) {
        message.textContent = result.error;
        return;
      }

      showStatusToast(t('closingDateSaved'));
      load();
    };

    const render = (cardsToRender = cards) => {
      list.innerHTML = '';

      if (!cardsToRender.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.className = 'credit-card-empty';
        cell.textContent = t('noCreditCards');
        row.append(cell);
        list.append(row);
        return;
      }

      cardsToRender.forEach((card) => {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        const name = document.createElement('strong');
        name.textContent = card.name;
        nameCell.append(name);

        const balanceCell = document.createElement('td');
        balanceCell.textContent = formatCurrency(card.total_balance);

        const closingDateCell = document.createElement('td');
        const dateWrap = document.createElement('div');
        dateWrap.className = 'credit-card-date-control';
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.value = card.closing_date || '';
        dateInput.setAttribute('aria-label', `${t('closingDate')} ${card.name}`);
        const dateText = document.createElement('span');
        dateText.textContent = formatDateOnly(card.closing_date);
        dateWrap.append(dateInput, dateText);
        closingDateCell.append(dateWrap);

        const actionsCell = document.createElement('td');
        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'secondary';
        saveButton.textContent = t('save');
        saveButton.addEventListener('click', () => updateClosingDate(card.id, dateInput.value));
        actionsCell.append(saveButton);

        row.append(nameCell, balanceCell, closingDateCell, actionsCell);
        list.append(row);
      });
    };

    const load = async () => {
      const result = await request('/api/credit-cards');
      if (result.error) {
        message.textContent = result.error;
        return;
      }

      cards = result.cards || [];
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
          total_balance: balanceInput.value,
          closing_date: closingDateInput.value,
        }),
      });

      if (result.error) {
        message.textContent = result.error;
        return;
      }

      form.reset();
      showStatusToast(t('creditCardAdded'));
      load();
    };

    const applyTranslations = () => {
      setText('#credit-card-title', t('creditCardAccounts'));
      setText('label[for="credit-card-name"]', t('cardName'));
      nameInput.placeholder = t('cardNamePlaceholder');
      setText('label[for="credit-card-balance"]', t('totalBalance'));
      setText('label[for="credit-card-closing-date"]', t('closingDate'));
      setText('#add-credit-card', t('addCard'));
      setText('.credit-card-table th:nth-child(1)', t('cardName'));
      setText('.credit-card-table th:nth-child(2)', t('totalBalance'));
      setText('.credit-card-table th:nth-child(3)', t('closingDate'));
      setText('.credit-card-table th:nth-child(4)', t('actions'));
      render();
    };

    const bind = () => {
      form.addEventListener('submit', handleSubmit);
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
