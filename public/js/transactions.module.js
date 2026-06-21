(function () {
  const create = ({ request, t, showStatusToast, getLanguage, confirmDelete: showDeleteConfirm }) => {
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
    const prevMonthButton = document.getElementById('transaction-prev-month');
    const nextMonthButton = document.getElementById('transaction-next-month');
    const kindFilter = document.getElementById('transaction-kind-filter');
    const categoryFilter = document.getElementById('transaction-category-filter');
    const categorySuggestions = document.getElementById('transaction-category-suggestions');
    const summaryIncome = document.getElementById('summary-income');
    const summaryExpense = document.getElementById('summary-expense');
    const summaryBalance = document.getElementById('summary-balance');
    const addButton = document.getElementById('open-add-transaction');
    const monthlyReportList = document.getElementById('monthly-report-list');
    const financeChartBars = document.getElementById('finance-chart-bars');
    const budgetCategoryList = document.getElementById('budget-category-list');
    const creditCardPaymentList = document.getElementById('credit-card-payment-list');
    const exportCsvButton = document.getElementById('export-transactions-csv');
    const exportPdfButton = document.getElementById('export-transactions-pdf');
    const exportExcelButton = document.getElementById('export-transactions-excel');

    // Natural-language quick entry elements.
    const quickEntryForm = document.getElementById('quick-entry-form');
    const quickEntryInput = document.getElementById('quick-entry-input');
    const quickEntryChips = document.getElementById('quick-entry-chips');
    const quickEntryAddSuggestion = document.getElementById('quick-entry-add-suggestion');

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
    let txnSort = { field: null, direction: 'desc' };
    let categories = [];
    let creditCards = [];
    let pendingEditTransaction = null;
    let dataVersion = 0;
    let currentFilters = {
      month: '',
      year: '',
      kind: '',
      category: '',
    };
    const budgetStorageKey = 'finance-category-budgets';
    const quickSuggestionsKey = 'transaction-quick-suggestions';
    const defaultQuickSuggestions = [
      'breakfast 5$',
      'gas 40$',
      'milk tea 65k yesterday',
      'electricity 850k',
    ];

    const formatCurrency = (value) => {
      const amount = Number(value || 0);
      return new Intl.NumberFormat(getLanguage() === 'vi' ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number.isFinite(amount) ? amount : 0);
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const match = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        return `${month}-${day}-${year.slice(-2)}`;
      }

      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return dateString;

      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${month}-${day}-${year}`;
    };

    const formatDateInputValue = (dateString) => {
      if (!dateString) return '';
      const match = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;

      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 10);
    };

    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const normalizeAmount = (value) => {
      const amount = Number(value || 0);
      return Number.isFinite(amount) ? amount : 0;
    };

    const getBudgetMap = () => {
      try {
        return JSON.parse(localStorage.getItem(budgetStorageKey) || '{}');
      } catch {
        return {};
      }
    };

    const saveBudget = (category, amount) => {
      const budgets = getBudgetMap();
      const normalized = Math.max(0, normalizeAmount(amount));
      if (normalized > 0) {
        budgets[category] = normalized;
      } else {
        delete budgets[category];
      }
      localStorage.setItem(budgetStorageKey, JSON.stringify(budgets));
      renderFinanceInsights();
    };

    const getMonthLabel = () => {
      if (!currentFilters.year || !currentFilters.month) return 'All time';
      const date = new Date(Number(currentFilters.year), Number(currentFilters.month) - 1, 1);
      return date.toLocaleDateString(getLanguage() === 'vi' ? 'vi-VN' : 'en-US', {
        month: 'long',
        year: 'numeric',
      });
    };

    const summarizeTransactions = () => {
      const income = transactions
        .filter(transaction => transaction.kind === 'income')
        .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);
      const expense = transactions
        .filter(transaction => transaction.kind === 'expense')
        .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);
      const categoryTotals = new Map();

      transactions
        .filter(transaction => transaction.kind === 'expense')
        .forEach((transaction) => {
          const category = transaction.category || 'Uncategorized';
          categoryTotals.set(category, (categoryTotals.get(category) || 0) + normalizeAmount(transaction.amount));
        });

      const sortedCategories = [...categoryTotals.entries()].sort((first, second) => second[1] - first[1]);
      return {
        income,
        expense,
        net: income - expense,
        sortedCategories,
        transactionCount: transactions.length,
      };
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
        dateInput.value = formatDateInputValue(transaction.occurred_on);
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
      const version = dataVersion;
      try {
        const params = new URLSearchParams();
        if (currentFilters.month) params.append('month', currentFilters.month);
        if (currentFilters.year) params.append('year', currentFilters.year);
        if (currentFilters.kind) params.append('kind', currentFilters.kind);
        if (currentFilters.category) params.append('category', currentFilters.category);

        const response = await request(`/api/transactions?${params.toString()}`);
        if (version !== dataVersion) return;
        transactions = response.transactions || [];
        renderTransactions();
        await loadSummary();
      } catch (error) {
        if (version !== dataVersion) return;
        console.error('Failed to load transactions:', error);
        showStatusToast(t('failedToLoadTransactions') || 'Failed to load transactions', 'error');
      }
    };

    const loadSummary = async () => {
      const version = dataVersion;
      try {
        const params = new URLSearchParams();
        if (currentFilters.month) params.append('month', currentFilters.month);
        if (currentFilters.year) params.append('year', currentFilters.year);

        const response = await request(`/api/transactions/summary?${params.toString()}`);
        if (version !== dataVersion) return;
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
        if (version !== dataVersion) return;
        console.error('Failed to load summary:', error);
      }
    };

    const loadCategories = async () => {
      const version = dataVersion;
      try {
        const response = await request('/api/transactions/categories');
        if (version !== dataVersion) return;
        categories = response.categories || [];
        renderCategorySuggestions();
        renderCategoryFilter();
      } catch (error) {
        if (version !== dataVersion) return;
        console.error('Failed to load categories:', error);
      }
    };

    const loadCreditCards = async () => {
      const version = dataVersion;
      try {
        const response = await request('/api/credit-cards');
        if (version !== dataVersion) return;
        creditCards = response.cards || [];
        renderCreditCardOptions();
      } catch (error) {
        if (version !== dataVersion) return;
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

    const updateTxnSortHeaders = () => {
      document.querySelectorAll('[data-txn-sort]').forEach((button) => {
        const isActive = button.dataset.txnSort === txnSort.field;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-sort', isActive ? (txnSort.direction === 'asc' ? 'ascending' : 'descending') : 'none');
        const arrow = button.querySelector('.sort-arrow');
        if (arrow) {
          arrow.textContent = isActive ? (txnSort.direction === 'asc' ? '▲' : '▼') : '⇅';
        }
      });
    };

    const sortTransactions = (rows) => {
      if (!txnSort.field) return rows;
      const sorted = [...rows];
      if (txnSort.field === 'amount') {
        sorted.sort((a, b) => {
          const result = normalizeAmount(a.amount) - normalizeAmount(b.amount);
          return txnSort.direction === 'asc' ? result : -result;
        });
      } else if (txnSort.field === 'date') {
        sorted.sort((a, b) => {
          const aTime = a.occurred_on ? new Date(a.occurred_on).getTime() : 0;
          const bTime = b.occurred_on ? new Date(b.occurred_on).getTime() : 0;
          const result = aTime - bTime;
          return txnSort.direction === 'asc' ? result : -result;
        });
      }
      return sorted;
    };

    const renderTransactions = () => {
      list.innerHTML = '';
      updateTxnSortHeaders();

      if (transactions.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 7;
        cell.className = 'transactions-empty';
        cell.textContent = t('noTransactions') || 'No transactions found';
        row.append(cell);
        list.append(row);
        renderFinanceInsights();
        return;
      }

      const rowsToRender = sortTransactions(transactions);
      rowsToRender.forEach((transaction) => {
        const isIncome = transaction.kind === 'income';
        const row = document.createElement('tr');
        row.className = `txn-row txn-row-${isIncome ? 'income' : 'expense'}`;

        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(transaction.occurred_on);
        dateCell.className = 'txn-date';

        // Kind badge
        const kindCell = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = `transaction-kind-badge ${isIncome ? 'income-badge' : 'expense-badge'}`;
        badge.textContent = isIncome ? (t('income') || 'Income') : (t('expense') || 'Expense');
        kindCell.append(badge);

        // Category chip
        const categoryCell = document.createElement('td');
        if (transaction.category) {
          const chip = document.createElement('span');
          chip.className = 'txn-category-chip';
          chip.textContent = transaction.category;
          categoryCell.append(chip);
        } else {
          categoryCell.textContent = '—';
          categoryCell.className = 'txn-muted';
        }

        // Amount
        const amountCell = document.createElement('td');
        amountCell.className = `txn-amount ${isIncome ? 'amount-income' : 'amount-expense'}`;
        amountCell.textContent = formatCurrency(transaction.amount);

        // Note
        const noteCell = document.createElement('td');
        if (transaction.note) {
          const noteSpan = document.createElement('span');
          noteSpan.className = 'txn-note';
          noteSpan.title = transaction.note;
          noteSpan.textContent = transaction.note.length > 30
            ? `${transaction.note.substring(0, 30)}…`
            : transaction.note;
          noteCell.append(noteSpan);
        } else {
          noteCell.textContent = '—';
          noteCell.className = 'txn-muted';
        }

        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.className = 'txn-actions';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'task-action-icon secondary';
        editBtn.setAttribute('aria-label', t('edit') || 'Edit');
        editBtn.title = t('edit') || 'Edit';
        editBtn.textContent = '✎';
        editBtn.addEventListener('click', () => window.transactionsModule.edit(transaction.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'task-action-icon danger';
        deleteBtn.setAttribute('aria-label', t('delete') || 'Delete');
        deleteBtn.title = t('delete') || 'Delete';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', () => window.transactionsModule.confirmDelete(transaction.id));

        actionsCell.append(editBtn, deleteBtn);
        row.append(dateCell, kindCell, categoryCell, amountCell, noteCell, actionsCell);
        list.append(row);
      });

      renderFinanceInsights();
    };

    const renderMonthlyReport = ({ income, expense, net, sortedCategories, transactionCount }) => {
      if (!monthlyReportList) return;
      const budget = income || 0;
      const remaining = budget - expense;
      const percent = budget > 0 ? Math.min(100, Math.round((expense / budget) * 100)) : 0;

      monthlyReportList.innerHTML = `
        <div class="finance-budget-hero">
          <div class="finance-budget-hero-label">${t('remainingThisMonth') || 'Remaining this month'}</div>
          <div class="finance-budget-hero-amount ${remaining >= 0 ? 'amount-income' : 'amount-expense'}">${formatCurrency(Math.abs(remaining))}</div>
          <div class="finance-budget-progress">
            <div class="finance-budget-progress-fill" style="width: ${percent}%"></div>
          </div>
          <div class="finance-budget-progress-label">${t('spent') || 'Spent'} ${formatCurrency(expense)} / ${formatCurrency(budget)} &nbsp; ${percent}%</div>
        </div>
        <div class="finance-stats-row">
          <div class="finance-stat">
            <span class="finance-stat-label">${t('totalExpenses') || 'TOTAL EXPENSES'}</span>
            <strong class="finance-stat-value amount-expense">${formatCurrency(expense)}</strong>
          </div>
          <div class="finance-stat">
            <span class="finance-stat-label">${t('totalIncome') || 'TOTAL INCOME'}</span>
            <strong class="finance-stat-value amount-income">${formatCurrency(income)}</strong>
          </div>
          <div class="finance-stat">
            <span class="finance-stat-label">${t('transactions') || 'TRANSACTIONS'}</span>
            <strong class="finance-stat-value">${transactionCount}</strong>
          </div>
        </div>
      `;
    };

    const renderCharts = ({ income, expense, sortedCategories }) => {
      if (!financeChartBars) return;

      // Build daily spending data for current month
      const daysInMonth = new Date(
        Number(currentFilters.year) || new Date().getFullYear(),
        Number(currentFilters.month) || (new Date().getMonth() + 1),
        0
      ).getDate();

      const dailySpending = new Array(daysInMonth).fill(0);
      transactions
        .filter((t) => t.kind === 'expense')
        .forEach((t) => {
          const day = t.occurred_on ? new Date(t.occurred_on).getDate() : 0;
          if (day >= 1 && day <= daysInMonth) {
            dailySpending[day - 1] += normalizeAmount(t.amount);
          }
        });

      const maxDaily = Math.max(...dailySpending, 1);
      const totalExpense = dailySpending.reduce((s, v) => s + v, 0);

      let html = `<div class="finance-daily-header">
        <span>${t('dailySpending') || 'Daily Spending'}</span>
        <strong>${t('total') || 'Total'}: ${formatCurrency(totalExpense)}</strong>
      </div>`;
      html += '<div class="finance-daily-chart">';
      dailySpending.forEach((amount, index) => {
        const height = Math.max(2, Math.round((amount / maxDaily) * 100));
        const isToday = (index + 1) === new Date().getDate()
          && Number(currentFilters.month) === (new Date().getMonth() + 1)
          && Number(currentFilters.year) === new Date().getFullYear();
        html += `<div class="finance-daily-bar${isToday ? ' is-today' : ''}" title="Day ${index + 1}: ${formatCurrency(amount)}">
          <div class="finance-daily-bar-fill" style="height: ${height}%"></div>
          ${(index + 1) % 5 === 0 || index === 0 ? `<span class="finance-daily-bar-label">${index + 1}</span>` : ''}
        </div>`;
      });
      html += '</div>';

      // Category breakdown (donut-style list)
      if (sortedCategories.length) {
        const catColors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
        html += '<div class="finance-category-breakdown">';
        sortedCategories.slice(0, 6).forEach(([category, total], i) => {
          const pct = expense > 0 ? Math.round((total / expense) * 100) : 0;
          html += `<div class="finance-category-row">
            <span class="finance-category-dot" style="background:${catColors[i % catColors.length]}"></span>
            <span class="finance-category-name">${escapeHtml(category)}</span>
            <span class="finance-category-pct">${pct}%</span>
            <strong class="finance-category-amount">${formatCurrency(total)}</strong>
          </div>`;
        });
        html += '</div>';
      }

      financeChartBars.innerHTML = html;
    };

    const renderBudgets = ({ sortedCategories }) => {
      if (!budgetCategoryList) return;
      const budgets = getBudgetMap();
      const categoryNames = [...new Set([
        ...sortedCategories.map(([category]) => category),
        ...categories,
        ...Object.keys(budgets),
      ])].filter(Boolean).sort((first, second) => first.localeCompare(second));

      if (categoryNames.length === 0) {
        budgetCategoryList.innerHTML = '<p class="finance-empty">Add expense categories to start budgeting.</p>';
        return;
      }

      budgetCategoryList.innerHTML = categoryNames.map((category) => {
        const spent = sortedCategories.find(([name]) => name === category)?.[1] || 0;
        const budget = budgets[category] || 0;
        const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
        const status = budget > 0
          ? `${formatCurrency(spent)} of ${formatCurrency(budget)}`
          : `${formatCurrency(spent)} spent`;

        return `
          <div class="budget-category-row" data-category="${escapeHtml(category)}">
            <div>
              <strong>${escapeHtml(category)}</strong>
              <span>${status}</span>
              <div class="budget-progress"><div style="width: ${percent}%"></div></div>
            </div>
            <input type="number" min="0" step="1" inputmode="decimal" value="${budget || ''}" aria-label="Budget for ${escapeHtml(category)}" />
          </div>
        `;
      }).join('');

      budgetCategoryList.querySelectorAll('.budget-category-row input').forEach((input) => {
        input.addEventListener('change', () => {
          const row = input.closest('.budget-category-row');
          saveBudget(row?.dataset.category || '', input.value);
        });
      });
    };

    const isCardPayment = (transaction) => {
      const text = `${transaction.category || ''} ${transaction.account || ''} ${transaction.note || ''}`.toLowerCase();
      return text.includes('payment') || text.includes('pay card') || text.includes('credit card payment');
    };

    const renderCreditCardPayments = () => {
      if (!creditCardPaymentList) return;
      if (creditCards.length === 0) {
        creditCardPaymentList.innerHTML = '<p class="finance-empty">No credit cards to track yet.</p>';
        return;
      }

      creditCardPaymentList.innerHTML = creditCards.map((card) => {
        const linkedTransactions = transactions.filter(transaction => Number(transaction.credit_card_id) === Number(card.id));
        const charges = linkedTransactions
          .filter(transaction => transaction.kind === 'expense' && !isCardPayment(transaction))
          .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);
        const payments = linkedTransactions
          .filter(transaction => isCardPayment(transaction))
          .reduce((sum, transaction) => sum + normalizeAmount(transaction.amount), 0);
        const balance = normalizeAmount(card.total_balance);

        return `
          <div>
            <span>${escapeHtml(card.name || 'Card')}</span>
            <strong>${formatCurrency(balance)} balance</strong>
            <small>${formatCurrency(charges)} charges - ${formatCurrency(payments)} payments this period</small>
          </div>
        `;
      }).join('');
    };

    const renderFinanceInsights = () => {
      const summary = summarizeTransactions();
      renderMonthlyReport(summary);
      renderCharts(summary);
      renderBudgets(summary);
      renderCreditCardPayments();
    };

    // --- Natural-language quick entry --------------------------------------

    // Parse free text like "breakfast 35k", "gas 80 nghin", "milk tea 65k
    // yesterday", "+salary 15m" into a transaction draft. Returns null when no
    // amount can be found.
    const parseQuickEntry = (rawText) => {
      const text = String(rawText || '').trim();
      if (!text) return null;

      // Income when prefixed with "+" or when an income keyword is present.
      const incomeKeywords = /\b(salary|income|bonus|lương|luong|thưởng|thuong|thu nhập|thu nhap)\b/i;
      let kind = 'expense';
      let working = text;
      if (working.startsWith('+')) {
        kind = 'income';
        working = working.slice(1).trim();
      } else if (incomeKeywords.test(working)) {
        kind = 'income';
      }

      // Date keywords: yesterday / hôm qua. Default is today.
      let occurredOn = new Date();
      const yesterday = /\b(yesterday|hôm qua|hom qua)\b/i;
      const today = /\b(today|hôm nay|hom nay)\b/i;
      if (yesterday.test(working)) {
        occurredOn = new Date(occurredOn.getTime() - 86400000);
        working = working.replace(yesterday, ' ');
      } else if (today.test(working)) {
        working = working.replace(today, ' ');
      }

      // Amount: a number optionally followed by a magnitude suffix.
      //   k / nghìn / nghin            → x1,000
      //   m / tr / triệu / trieu / mil → x1,000,000
      const amountRegex = /(\d+(?:[.,]\d+)?)\s*(k|nghìn|nghin|m|tr|triệu|trieu|mil|million)?\b/i;
      const match = working.match(amountRegex);
      if (!match) return null;

      const numeric = Number(String(match[1]).replace(',', '.'));
      if (!Number.isFinite(numeric)) return null;
      const suffix = (match[2] || '').toLowerCase();
      let amount = numeric;
      if (['k', 'nghìn', 'nghin'].includes(suffix)) amount = numeric * 1000;
      else if (['m', 'tr', 'triệu', 'trieu', 'mil', 'million'].includes(suffix)) amount = numeric * 1000000;
      if (amount <= 0) return null;

      // Whatever text remains after removing the amount token becomes the
      // category/description. Strip currency symbols so they don't leak in.
      const description = working
        .replace(match[0], ' ')
        .replace(/[$₫€£]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        kind,
        amount,
        category: description || (kind === 'income' ? 'Income' : 'Expense'),
        note: text,
        occurred_on: occurredOn.toISOString().slice(0, 10),
        credit_card_id: null,
      };
    };

    const getQuickSuggestions = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(quickSuggestionsKey) || 'null');
        if (Array.isArray(stored) && stored.length) return stored;
      } catch { /* fall through to defaults */ }
      return [...defaultQuickSuggestions];
    };

    const saveQuickSuggestions = (list) => {
      localStorage.setItem(quickSuggestionsKey, JSON.stringify(list));
    };

    const renderQuickSuggestions = () => {
      if (!quickEntryChips) return;
      const suggestions = getQuickSuggestions();
      quickEntryChips.innerHTML = '';
      suggestions.forEach((suggestion) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'quick-entry-chip';
        chip.setAttribute('role', 'listitem');
        chip.textContent = suggestion;
        // Click fills the input so the user can review/edit before recording.
        chip.addEventListener('click', () => {
          if (quickEntryInput) {
            quickEntryInput.value = suggestion;
            quickEntryInput.focus();
          }
        });
        // A small remove control on each chip.
        const remove = document.createElement('span');
        remove.className = 'quick-entry-chip-remove';
        remove.textContent = '×';
        remove.setAttribute('role', 'button');
        remove.setAttribute('aria-label', `Remove suggestion ${suggestion}`);
        remove.addEventListener('click', (event) => {
          event.stopPropagation();
          const next = getQuickSuggestions().filter((item) => item !== suggestion);
          saveQuickSuggestions(next);
          renderQuickSuggestions();
        });
        chip.append(remove);
        quickEntryChips.append(chip);
      });
    };

    const addCurrentAsSuggestion = () => {
      const text = (quickEntryInput?.value || '').trim();
      if (!text) {
        showStatusToast(t('quickEntryTypeFirst') || 'Type something to save as a suggestion', 'error');
        return;
      }
      const list = getQuickSuggestions();
      if (list.includes(text)) {
        showStatusToast(t('quickEntryExists') || 'That suggestion already exists', 'error');
        return;
      }
      list.push(text);
      saveQuickSuggestions(list);
      renderQuickSuggestions();
      showStatusToast(t('quickEntryAdded') || 'Suggestion added', 'success');
    };

    const handleQuickEntrySubmit = async (event) => {
      event.preventDefault();
      const draft = parseQuickEntry(quickEntryInput?.value);
      if (!draft) {
        showStatusToast(t('quickEntryParseFailed') || 'Could not read an amount. Try "lunch 35k".', 'error');
        quickEntryInput?.focus();
        return;
      }

      try {
        const result = await request('/api/transactions', {
          method: 'POST',
          body: JSON.stringify(draft),
        });
        if (result.error) {
          showStatusToast(result.error, 'error');
          return;
        }
        showStatusToast(t('transactionAdded') || 'Transaction added', 'success');
        if (quickEntryInput) quickEntryInput.value = '';

        // Jump the month filter to the new transaction's month, then reload.
        const d = new Date(draft.occurred_on);
        monthFilter.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        currentFilters.year = d.getFullYear().toString();
        currentFilters.month = (d.getMonth() + 1).toString();
        await load();
      } catch (error) {
        console.error('Quick entry failed:', error);
        showStatusToast(t('failedToSaveTransaction') || 'Failed to save transaction', 'error');
      }
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
          const result = await request(`/api/transactions/${pendingEditTransaction.id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
          });
          if (result.error) {
            showFormError(result.error);
            return;
          }
          showStatusToast(t('transactionUpdated') || 'Transaction updated', 'success');
        } else {
          const result = await request('/api/transactions', {
            method: 'POST',
            body: JSON.stringify(data),
          });
          if (result.error) {
            showFormError(result.error);
            return;
          }
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

      if (showDeleteConfirm) {
        showDeleteConfirm(transaction);
        return;
      }

      if (confirm(t('confirmDeleteTransaction') || `Delete this ${transaction.kind} transaction of ${formatCurrency(transaction.amount)}?`)) {
        deleteTransaction(transaction);
      }
    };

    const deleteTransaction = async (transaction) => {
      const id = typeof transaction === 'object' ? transaction.id : transaction;
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

    const shiftMonthFilter = (monthDelta) => {
      const baseValue = monthFilter.value || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const [year, month] = baseValue.split('-').map(Number);
      const nextDate = new Date(year, month - 1 + monthDelta, 1);
      monthFilter.value = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
      applyFilters();
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

    const exportFileName = (extension) => {
      const period = currentFilters.year && currentFilters.month
        ? `${currentFilters.year}-${String(currentFilters.month).padStart(2, '0')}`
        : 'all';
      return `finance-transactions-${period}.${extension}`;
    };

    const transactionExportRows = () => transactions.map(transaction => ({
      Date: formatDate(transaction.occurred_on),
      Type: transaction.kind,
      Category: transaction.category || '',
      Amount: normalizeAmount(transaction.amount).toFixed(2),
      Account: transaction.account || '',
      Note: transaction.note || '',
      'Credit Card': creditCards.find(card => Number(card.id) === Number(transaction.credit_card_id))?.name || '',
    }));

    const downloadBlob = (content, type, fileName) => {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };

    const exportCsv = () => {
      const rows = transactionExportRows();
      if (rows.length === 0) {
        showStatusToast('No transactions to export', 'error');
        return;
      }

      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(','),
        ...rows.map(row => headers.map(header => `"${String(row[header]).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      downloadBlob(csv, 'text/csv;charset=utf-8', exportFileName('csv'));
    };

    const exportExcel = () => {
      const rows = transactionExportRows();
      if (rows.length === 0) {
        showStatusToast('No transactions to export', 'error');
        return;
      }

      const headers = Object.keys(rows[0]);
      const table = `
        <table>
          <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      `;
      downloadBlob(table, 'application/vnd.ms-excel;charset=utf-8', exportFileName('xls'));
    };

    const exportPdf = () => {
      const rows = transactionExportRows();
      if (rows.length === 0) {
        showStatusToast('No transactions to export', 'error');
        return;
      }

      const headers = Object.keys(rows[0]);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showStatusToast('Could not open PDF preview', 'error');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Finance Report</title>
            <style>
              body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
              h1 { font-size: 22px; margin: 0 0 8px; }
              p { margin: 0 0 20px; color: #4b5563; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
              th { background: #f3f4f6; }
            </style>
          </head>
          <body>
            <h1>Finance Report</h1>
            <p>${escapeHtml(getMonthLabel())}</p>
            <table>
              <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
              <tbody>${rows.map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    };

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
      exportCsvButton?.addEventListener('click', exportCsv);
      exportPdfButton?.addEventListener('click', exportPdf);
      exportExcelButton?.addEventListener('click', exportExcel);

      // Natural-language quick entry wiring.
      quickEntryForm?.addEventListener('submit', handleQuickEntrySubmit);
      quickEntryAddSuggestion?.addEventListener('click', addCurrentAsSuggestion);
      renderQuickSuggestions();

      // Sort header for amount column
      document.querySelectorAll('[data-txn-sort]').forEach((button) => {
        button.addEventListener('click', () => {
          const field = button.dataset.txnSort;
          if (txnSort.field === field) {
            txnSort.direction = txnSort.direction === 'asc' ? 'desc' : 'asc';
          } else {
            txnSort = { field, direction: 'desc' };
          }
          renderTransactions();
        });
      });

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
      if (prevMonthButton) {
        prevMonthButton.addEventListener('click', () => shiftMonthFilter(-1));
      }
      if (nextMonthButton) {
        nextMonthButton.addEventListener('click', () => shiftMonthFilter(1));
      }
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
      renderFinanceInsights();
    };

    const reset = () => {
      dataVersion += 1;
      transactions = [];
      categories = [];
      creditCards = [];
      pendingEditTransaction = null;
      closeModal();
      closeImportModal();
      list.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No transactions found</td></tr>';
      summaryIncome.textContent = formatCurrency(0);
      summaryExpense.textContent = formatCurrency(0);
      summaryBalance.textContent = formatCurrency(0);
      summaryBalance.className = 'summary-amount';
      renderCategorySuggestions();
      renderCategoryFilter();
      renderCreditCardOptions();
      renderFinanceInsights();
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
      reset,
      applyTranslations,
      edit: editTransaction,
      confirmDelete,
      deleteTransaction,
    };
  };

  window.TransactionsModule = { create };
}());
