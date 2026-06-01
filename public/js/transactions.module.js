(function () {
  const create = ({ request, t, showStatusToast, getLanguage }) => {
    const panel = document.getElementById('transactions-panel');
    const list = document.getElementById('transactions-list');
    const modal = document.getElementById('transaction-modal');
    const modalTitle = document.getElementById('transaction-modal-title');
    const form = document.getElementById('transaction-form');
    const kindInput = document.getElementById('transaction-kind');
    const amountInput = document.getElementById('transaction-amount');
    const categoryInput = document.getElementById('transaction-category');
    const dateInput = document.getElementById('transaction-date');
    const accountInput = document.getElementById('transaction-account');
    const creditCardInput = document.getElementById('transaction-credit-card');
    const noteInput = document.getElementById('transaction-note');
    const formError = document.getElementById('transaction-form-error');
    const cancelButton = document.getElementById('cancel-transaction');
    const monthFilter = document.getElementById('transaction-month-filter');
    const kindFilter = document.getElementById('transaction-kind-filter');
    const categoryFilter = document.getElementById('transaction-category-filter');
    const categorySuggestions = document.getElementById('transaction-category-suggestions');
    const summaryIncome = document.getElementById('summary-income');
    const summaryExpense = document.getElementById('summary-expense');
    const summaryBalance = document.getElementById('summary-balance');
    const addButton = document.getElementById('open-add-transaction');

    // Statement import (PDF → expenses) elements.
    const importButton = document.getElementById('import-statement');
    const importFileInput = document.getElementById('import-statement-file');
    const importModal = document.getElementById('import-statement-modal');
    const importStatusBox = document.getElementById('import-statement-status');
    const importStatusText = document.getElementById('import-statement-status-text');
    const importResultBox = document.getElementById('import-statement-result');
    const importCardInput = document.getElementById('import-statement-card');
    const importRows = document.getElementById('import-statement-rows');
    const importSelectAll = document.getElementById('import-statement-select-all');
    const importError = document.getElementById('import-statement-error');
    const cancelImportButton = document.getElementById('cancel-import-statement');
    const confirmImportButton = document.getElementById('confirm-import-statement');

    let transactions = [];
    let categories = [];
    let creditCards = [];
    let pendingEditTransaction = null;
    let currentFilters = {
      month: '',
      year: '',
      kind: '',
      category: '',
    };

    const formatCurrency = (value) => {
      const amount = Number(value || 0);
      return new Intl.NumberFormat(getLanguage() === 'vi' ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number.isFinite(amount) ? amount : 0);
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(`${dateString}T00:00:00`);
      if (Number.isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString(getLanguage() === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const showFormError = (text) => {
      formError.textContent = text;
      formError.classList.remove('hidden');
    };

    const clearFormError = () => {
      formError.textContent = '';
      formError.classList.add('hidden');
    };

    const openModal = (transaction = null) => {
      pendingEditTransaction = transaction;
      clearFormError();

      if (transaction) {
        modalTitle.textContent = t('editTransaction') || 'Edit Transaction';
        kindInput.value = transaction.kind;
        amountInput.value = transaction.amount;
        categoryInput.value = transaction.category || '';
        dateInput.value = transaction.occurred_on;
        accountInput.value = transaction.account || '';
        creditCardInput.value = transaction.credit_card_id || '';
        noteInput.value = transaction.note || '';
      } else {
        modalTitle.textContent = t('addTransaction') || 'Add Transaction';
        form.reset();
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
      }

      modal.classList.remove('hidden');
      amountInput.focus();
    };

    const closeModal = () => {
      pendingEditTransaction = null;
      form.reset();
      clearFormError();
      modal.classList.add('hidden');
    };

    const loadTransactions = async () => {
      try {
        const params = new URLSearchParams();
        if (currentFilters.month) params.append('month', currentFilters.month);
        if (currentFilters.year) params.append('year', currentFilters.year);
        if (currentFilters.kind) params.append('kind', currentFilters.kind);
        if (currentFilters.category) params.append('category', currentFilters.category);

        const response = await request(`/api/transactions?${params.toString()}`);
        transactions = response.transactions || [];
        renderTransactions();
        await loadSummary();
      } catch (error) {
        console.error('Failed to load transactions:', error);
        showStatusToast(t('failedToLoadTransactions') || 'Failed to load transactions', 'error');
      }
    };

    const loadSummary = async () => {
      try {
        const params = new URLSearchParams();
        if (currentFilters.month) params.append('month', currentFilters.month);
        if (currentFilters.year) params.append('year', currentFilters.year);

        const response = await request(`/api/transactions/summary?${params.toString()}`);
        const summary = response.summary || { income: 0, expense: 0, net: 0 };

        summaryIncome.textContent = formatCurrency(summary.income);
        summaryExpense.textContent = formatCurrency(summary.expense);
        summaryBalance.textContent = formatCurrency(summary.net);

        // Add color class based on net value
        summaryBalance.className = 'summary-amount';
        if (summary.net > 0) {
          summaryBalance.classList.add('positive');
        } else if (summary.net < 0) {
          summaryBalance.classList.add('negative');
        }
      } catch (error) {
        console.error('Failed to load summary:', error);
      }
    };

    const loadCategories = async () => {
      try {
        const response = await request('/api/transactions/categories');
        categories = response.categories || [];
        renderCategorySuggestions();
        renderCategoryFilter();
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    const loadCreditCards = async () => {
      try {
        const response = await request('/api/credit-cards');
        creditCards = response.cards || [];
        renderCreditCardOptions();
      } catch (error) {
        console.error('Failed to load credit cards:', error);
      }
    };

    const renderCategorySuggestions = () => {
      categorySuggestions.innerHTML = categories
        .map(cat => `<option value="${cat}">`)
        .join('');
    };

    const renderCategoryFilter = () => {
      const currentValue = categoryFilter.value;
      categoryFilter.innerHTML = '<option value="">All Categories</option>';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
      });
      categoryFilter.value = currentValue;
    };

    const renderCreditCardOptions = () => {
      const currentValue = creditCardInput.value;
      creditCardInput.innerHTML = '<option value="">None</option>';
      creditCards.forEach(card => {
        const option = document.createElement('option');
        option.value = card.id;
        option.textContent = card.name;
        creditCardInput.appendChild(option);
      });
      creditCardInput.value = currentValue;
    };

    const renderTransactions = () => {
      if (transactions.length === 0) {
        list.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No transactions found</td></tr>';
        return;
      }

      list.innerHTML = transactions.map(transaction => {
        const kindLabel = transaction.kind === 'income' ? (t('income') || 'Income') : (t('expense') || 'Expense');
        const kindClass = transaction.kind === 'income' ? 'income-badge' : 'expense-badge';

        return `
          <tr>
            <td>${formatDate(transaction.occurred_on)}</td>
            <td><span class="transaction-kind-badge ${kindClass}">${kindLabel}</span></td>
            <td>${transaction.category || '—'}</td>
            <td class="${transaction.kind === 'income' ? 'amount-income' : 'amount-expense'}">${formatCurrency(transaction.amount)}</td>
            <td>${transaction.account || '—'}</td>
            <td>${transaction.note ? `<span title="${transaction.note}">${transaction.note.substring(0, 30)}${transaction.note.length > 30 ? '...' : ''}</span>` : '—'}</td>
            <td>
              <button class="task-action-icon secondary" onclick="window.transactionsModule.edit(${transaction.id})" aria-label="Edit" title="Edit">✎</button>
              <button class="task-action-icon danger" onclick="window.transactionsModule.confirmDelete(${transaction.id})" aria-label="Delete" title="Delete">×</button>
            </td>
          </tr>
        `;
      }).join('');
    };

    const handleSubmit = async (event) => {
      event.preventDefault();
      clearFormError();

      const data = {
        occurred_on: dateInput.value,
        kind: kindInput.value,
        amount: parseFloat(amountInput.value),
        category: categoryInput.value.trim(),
        account: accountInput.value.trim(),
        note: noteInput.value.trim(),
        credit_card_id: creditCardInput.value || null,
      };

      try {
        if (pendingEditTransaction) {
          await request(`/api/transactions/${pendingEditTransaction.id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
          });
          showStatusToast(t('transactionUpdated') || 'Transaction updated', 'success');
        } else {
          await request('/api/transactions', {
            method: 'POST',
            body: JSON.stringify(data),
          });
          showStatusToast(t('transactionAdded') || 'Transaction added', 'success');

          // Update filter to show the month of the newly created transaction
          const transactionDate = new Date(data.occurred_on);
          const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
          monthFilter.value = transactionMonth;
          currentFilters.year = transactionDate.getFullYear().toString();
          currentFilters.month = (transactionDate.getMonth() + 1).toString();
        }
        closeModal();
        await load();
      } catch (error) {
        console.error('Failed to save transaction:', error);
        showFormError(error.message || (t('failedToSaveTransaction') || 'Failed to save transaction'));
      }
    };

    const editTransaction = (id) => {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        openModal(transaction);
      }
    };

    const confirmDelete = (id) => {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) return;

      if (confirm(t('confirmDeleteTransaction') || `Delete this ${transaction.kind} transaction of ${formatCurrency(transaction.amount)}?`)) {
        deleteTransaction(id);
      }
    };

    const deleteTransaction = async (id) => {
      try {
        await request(`/api/transactions/${id}`, { method: 'DELETE' });
        showStatusToast(t('transactionDeleted') || 'Transaction deleted', 'success');
        await load();
      } catch (error) {
        console.error('Failed to delete transaction:', error);
        showStatusToast(t('failedToDeleteTransaction') || 'Failed to delete transaction', 'error');
      }
    };

    const applyFilters = () => {
      const monthValue = monthFilter.value;
      if (monthValue) {
        const [year, month] = monthValue.split('-');
        currentFilters.year = year;
        currentFilters.month = month;
      } else {
        currentFilters.year = '';
        currentFilters.month = '';
      }
      currentFilters.kind = kindFilter.value;
      currentFilters.category = categoryFilter.value;
      loadTransactions();
    };

    const initializeFilters = () => {
      // Set default to current month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      monthFilter.value = currentMonth;
      currentFilters.year = now.getFullYear().toString();
      currentFilters.month = (now.getMonth() + 1).toString();
    };

    // ---- Statement import (PDF → expenses) ----------------------------------

    const renderImportCardOptions = () => {
      const currentValue = importCardInput.value;
      importCardInput.innerHTML = '<option value="">None</option>';
      creditCards.forEach(card => {
        const option = document.createElement('option');
        option.value = card.id;
        option.textContent = card.name;
        importCardInput.appendChild(option);
      });
      importCardInput.value = currentValue;
    };

    const setImportError = (text) => {
      if (!text) {
        importError.textContent = '';
        importError.classList.add('hidden');
        return;
      }
      importError.textContent = text;
      importError.classList.remove('hidden');
    };

    const closeImportModal = () => {
      importModal.classList.add('hidden');
      importRows.innerHTML = '';
      importResultBox.classList.add('hidden');
      setImportError('');
      confirmImportButton.disabled = true;
      importFileInput.value = '';
    };

    const updateImportConfirmState = () => {
      const checked = importRows.querySelectorAll('input.import-row-select:checked').length;
      confirmImportButton.disabled = checked === 0;
    };

    const renderImportRows = (items) => {
      importRows.innerHTML = '';
      items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.dataset.index = String(index);

        const selectCell = document.createElement('td');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'import-row-select';
        checkbox.checked = true;
        checkbox.addEventListener('change', () => {
          updateImportConfirmState();
          if (!checkbox.checked) importSelectAll.checked = false;
        });
        selectCell.appendChild(checkbox);

        const dateCell = document.createElement('td');
        const dateField = document.createElement('input');
        dateField.type = 'date';
        dateField.className = 'import-row-date';
        dateField.value = item.date;
        dateCell.appendChild(dateField);

        const descCell = document.createElement('td');
        const descField = document.createElement('input');
        descField.type = 'text';
        descField.maxLength = 100;
        descField.className = 'import-row-desc';
        descField.value = item.category || '';
        descCell.appendChild(descField);

        const amountCell = document.createElement('td');
        const amountField = document.createElement('input');
        amountField.type = 'number';
        amountField.min = '0.01';
        amountField.step = '0.01';
        amountField.className = 'import-row-amount';
        amountField.value = item.amount;
        amountCell.appendChild(amountField);

        row.append(selectCell, dateCell, descCell, amountCell);
        importRows.appendChild(row);
      });
      importSelectAll.checked = items.length > 0;
      updateImportConfirmState();
    };

    const openImport = () => {
      setImportError('');
      importResultBox.classList.add('hidden');
      importRows.innerHTML = '';
      confirmImportButton.disabled = true;
      importFileInput.value = '';
      importFileInput.click();
    };

    const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // readAsDataURL yields "data:application/pdf;base64,XXXX" — strip the prefix.
        const result = String(reader.result || '');
        resolve(result.slice(result.indexOf(',') + 1));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    const handleImportFile = async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      // Show the modal in a "parsing" state while Claude reads the PDF.
      renderImportCardOptions();
      setImportError('');
      importResultBox.classList.add('hidden');
      importStatusBox.classList.remove('hidden');
      importStatusText.textContent = t('importParsing') || 'Reading your statement…';
      importModal.classList.remove('hidden');

      try {
        const base64Pdf = await readFileAsBase64(file);
        const response = await request('/api/transactions/import-statement', {
          method: 'POST',
          body: JSON.stringify({ pdf: base64Pdf }),
        });

        importStatusBox.classList.add('hidden');

        if (response.error) {
          importResultBox.classList.add('hidden');
          setImportError(response.error);
          return;
        }

        const items = response.items || [];
        if (items.length === 0) {
          setImportError(t('importNoItems') || 'No purchases were found in this statement.');
          return;
        }

        importResultBox.classList.remove('hidden');
        renderImportRows(items);
      } catch (error) {
        console.error('Failed to import statement:', error);
        importStatusBox.classList.add('hidden');
        setImportError(t('importFailed') || 'Failed to import statement.');
      } finally {
        // Allow re-selecting the same file later.
        importFileInput.value = '';
      }
    };

    const confirmImport = async () => {
      const rows = Array.from(importRows.querySelectorAll('tr'));
      const selected = rows.filter(row => row.querySelector('input.import-row-select')?.checked);
      if (selected.length === 0) return;

      const creditCardId = importCardInput.value || null;
      confirmImportButton.disabled = true;
      setImportError('');

      let created = 0;
      let lastDate = null;
      for (const row of selected) {
        const date = row.querySelector('.import-row-date')?.value;
        const description = (row.querySelector('.import-row-desc')?.value || '').trim();
        const amount = parseFloat(row.querySelector('.import-row-amount')?.value);
        if (!date || !Number.isFinite(amount) || amount <= 0) continue;

        const response = await request('/api/transactions', {
          method: 'POST',
          body: JSON.stringify({
            occurred_on: date,
            kind: 'expense',
            amount,
            category: description,
            note: description,
            credit_card_id: creditCardId,
          }),
        });
        if (!response.error) {
          created += 1;
          lastDate = date;
        }
      }

      if (created === 0) {
        confirmImportButton.disabled = false;
        setImportError(t('importFailed') || 'Failed to import statement.');
        return;
      }

      // Jump the month filter to the imported statement's month so the new
      // expenses are visible immediately.
      if (lastDate) {
        const d = new Date(`${lastDate}T00:00:00`);
        monthFilter.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        currentFilters.year = d.getFullYear().toString();
        currentFilters.month = (d.getMonth() + 1).toString();
      }

      closeImportModal();
      await load();
      const successMsg = (t('importSuccess') || 'Imported {count} transactions').replace('{count}', created);
      showStatusToast(successMsg, 'success');
    };

    const bind = () => {
      form.addEventListener('submit', handleSubmit);
      cancelButton.addEventListener('click', closeModal);
      addButton.addEventListener('click', () => openModal());

      // Statement import wiring.
      if (importButton) {
        importButton.addEventListener('click', openImport);
        importFileInput.addEventListener('change', handleImportFile);
        cancelImportButton.addEventListener('click', closeImportModal);
        confirmImportButton.addEventListener('click', confirmImport);
        importSelectAll.addEventListener('change', () => {
          importRows.querySelectorAll('input.import-row-select').forEach((cb) => {
            cb.checked = importSelectAll.checked;
          });
          updateImportConfirmState();
        });
        importModal.addEventListener('click', (event) => {
          if (event.target === importModal) closeImportModal();
        });
      }

      modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
      });

      monthFilter.addEventListener('change', applyFilters);
      kindFilter.addEventListener('change', applyFilters);
      categoryFilter.addEventListener('change', applyFilters);

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
          closeModal();
        }
        if (event.key === 'Escape' && !importModal.classList.contains('hidden')) {
          closeImportModal();
        }
      });
    };

    const load = async () => {
      await Promise.all([
        loadTransactions(),
        loadCategories(),
        loadCreditCards(),
      ]);
    };

    const render = () => {
      initializeFilters();
      load();
    };

    const applyTranslations = () => {
      // Apply translations when language changes
      renderTransactions();
    };

    return {
      bind,
      render,
      load,
      applyTranslations,
      edit: editTransaction,
      confirmDelete,
    };
  };

  window.TransactionsModule = { create };
}());
