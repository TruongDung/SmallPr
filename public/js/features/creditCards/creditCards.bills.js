(function () {
  const createFastAccessBills = ({ elements, formatters, request, t, showStatusToast }) => {
    let bills = [];
    let pendingEditBill = null;
    let billSort = { field: null, direction: null };

    const showEditBillError = (text) => window.CreditCardFeature.dom.setFieldError(elements.editBillError, text);
    const clearEditBillError = () => window.CreditCardFeature.dom.clearFieldError(elements.editBillError);

    const billGroupKey = (bill) => String(bill.item || '').trim().toLowerCase();

    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const setBills = (nextBills) => {
      bills = nextBills || [];
    };

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

    const showExportError = () => {
      if (typeof showStatusToast === 'function') {
        showStatusToast(t('noBillsToExport') || 'No expense rows to export', 'error');
        return;
      }
      elements.message.textContent = t('noBillsToExport') || 'No expense rows to export';
    };

    const exportFileName = (extension) => `financial-expense-${new Date().toISOString().slice(0, 10)}.${extension}`;

    const billExportRows = () => {
      const rows = [];
      getBillGroups().forEach((group) => {
        group.bills.forEach((bill) => {
          rows.push({
            Group: group.label,
            Item: bill.item || '',
            Amount: formatters.normalizeAmount(bill.amount).toFixed(2),
            'Due Date': bill.due_date || '',
            'Pay Before': bill.pay_before || '',
            Status: bill.status || '',
          });
        });
      });
      return rows;
    };

    const exportCsv = () => {
      const rows = billExportRows();
      if (!rows.length) {
        showExportError();
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
      const rows = billExportRows();
      if (!rows.length) {
        showExportError();
        return;
      }

      const headers = Object.keys(rows[0]);
      const table = `
        <table>
          <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="2">Grand total</td><td>${escapeHtml(formatters.normalizeAmount(bills.reduce((sum, bill) => sum + formatters.normalizeAmount(bill.amount), 0)).toFixed(2))}</td><td colspan="3"></td></tr>
          </tfoot>
        </table>
      `;
      downloadBlob(table, 'application/vnd.ms-excel;charset=utf-8', exportFileName('xls'));
    };

    const exportPdf = () => {
      const rows = billExportRows();
      if (!rows.length) {
        showExportError();
        return;
      }

      const headers = Object.keys(rows[0]);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        if (typeof showStatusToast === 'function') showStatusToast('Could not open PDF preview', 'error');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Financial Expense Report</title>
            <style>
              body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
              h1 { font-size: 22px; margin: 0 0 8px; }
              p { margin: 0 0 20px; color: #4b5563; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
              th { background: #f3f4f6; }
              tfoot td { font-weight: 700; }
            </style>
          </head>
          <body>
            <h1>Financial Expense Report</h1>
            <p>Grand total: ${escapeHtml(formatters.formatCurrency(bills.reduce((sum, bill) => sum + formatters.normalizeAmount(bill.amount), 0)))}</p>
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

    const updateTotals = () => {
      const billsTotal = bills.reduce((sum, bill) => sum + formatters.normalizeAmount(bill.amount), 0);
      const paidCount = bills.filter((bill) => String(bill.status || '').toLowerCase() === 'paid').length;
      const unpaidCount = bills.length - paidCount;

      const statsEl = document.getElementById('expense-stats');
      if (!statsEl) return;
      statsEl.innerHTML = '';

      if (!bills.length) {
        statsEl.classList.add('hidden');
        return;
      }
      statsEl.classList.remove('hidden');

      const stats = [
        { label: t('totalExpense') || 'Total Expense', value: formatters.formatCurrency(billsTotal), tone: 'balance' },
        { label: t('paid') || 'Paid', value: String(paidCount), tone: 'count' },
        { label: t('unpaid') || 'Unpaid', value: String(unpaidCount), tone: 'interest' },
      ];

      stats.forEach((stat) => {
        const card = document.createElement('div');
        card.className = `credit-card-stat credit-card-stat-${stat.tone}`;
        const label = document.createElement('span');
        label.className = 'credit-card-stat-label';
        label.textContent = stat.label;
        const value = document.createElement('strong');
        value.className = 'credit-card-stat-value';
        value.textContent = stat.value;
        card.append(label, value);
        statsEl.append(card);
      });
    };

    const sortBills = (billsToSort) => {
      if (billSort.field !== 'amount') return billsToSort;
      return [...billsToSort].sort((first, second) => {
        const result = formatters.normalizeAmount(first.amount) - formatters.normalizeAmount(second.amount);
        return billSort.direction === 'asc' ? result : -result;
      });
    };

    const getBillGroups = () => {
      const separateBillNames = new Set(['phone', 'auto loan', 'daycare']);
      const groups = [];
      const houseBills = bills.filter((bill) => !separateBillNames.has(billGroupKey(bill)));
      if (houseBills.length) groups.push({ label: t('monthlyBills'), bills: sortBills(houseBills) });

      ['phone', 'auto loan', 'daycare'].forEach((billName) => {
        const matchingBills = bills.filter((bill) => billGroupKey(bill) === billName);
        if (matchingBills.length) {
          groups.push({ label: matchingBills[0].item || t('notAvailable'), bills: sortBills(matchingBills) });
        }
      });

      return groups;
    };

    const createBillGroupSummaryRow = (group) => {
      const total = group.bills.reduce((sum, bill) => sum + formatters.normalizeAmount(bill.amount), 0);
      const row = document.createElement('tr');
      row.className = 'fast-access-bill-group-summary';

      const cell = document.createElement('td');
      cell.colSpan = 6;

      const label = document.createElement('strong');
      label.textContent = group.label;

      const amount = document.createElement('span');
      amount.textContent = formatters.formatCurrency(total);

      cell.append(label, amount);
      row.append(cell);
      return row;
    };

    const openEditModal = (bill) => {
      pendingEditBill = bill;
      clearEditBillError();
      elements.editBillForm.reset();
      
      if (bill) {
        // Editing existing bill
        elements.editBillItemInput.value = bill.item || '';
        elements.editBillAmountInput.value = formatters.formatBalanceInput(bill.amount);
        elements.editBillDueDateInput.value = bill.due_date || '';
        elements.editBillPayBeforeInput.value = bill.pay_before || '';
        elements.editBillStatusInput.value = bill.status || 'Unpaid';
        document.getElementById('edit-fast-access-bill-title').textContent = t('editBill') || 'Edit bill';
      } else {
        // Adding new bill
        elements.editBillItemInput.value = '';
        elements.editBillAmountInput.value = '';
        elements.editBillDueDateInput.value = '';
        elements.editBillPayBeforeInput.value = '';
        elements.editBillStatusInput.value = 'Unpaid';
        document.getElementById('edit-fast-access-bill-title').textContent = t('addExpense') || 'Add Expense';
      }
      
      elements.editBillModal.classList.remove('hidden');
      elements.editBillItemInput.focus();
      elements.editBillItemInput.select();
    };

    const closeEditModal = () => {
      pendingEditBill = null;
      clearEditBillError();
      elements.editBillForm.reset();
      elements.editBillModal.classList.add('hidden');
    };

    const updateBill = async (bill, updates, { showModalError = false } = {}) => {
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
          elements.message.textContent = result.error;
        }
        render();
        return null;
      }

      bills = bills.map((savedBill) => (savedBill.id === bill.id ? result.bill : savedBill));
      elements.message.textContent = '';
      render();
      return result.bill;
    };

    const createBill = async (billData, { showModalError = false } = {}) => {
      const result = await request('/api/credit-cards/fast-access-bills', {
        method: 'POST',
        body: JSON.stringify({
          item: billData.item,
          amount: billData.amount,
          due_date: billData.due_date,
          pay_before: billData.pay_before,
          status: billData.status,
        }),
      });

      if (result.error) {
        if (showModalError) {
          showEditBillError(result.error);
        } else {
          elements.message.textContent = result.error;
        }
        render();
        return null;
      }

      bills.push(result.bill);
      elements.message.textContent = '';
      render();
      if (typeof showStatusToast === 'function') {
        showStatusToast(t('expenseAdded') || 'Expense added', 'success');
      }
      return result.bill;
    };

    const updateFromModal = async () => {
      clearEditBillError();
      elements.message.textContent = '';

      const item = elements.editBillItemInput.value.trim();
      if (!item) {
        showEditBillError(t('billItemRequired'));
        elements.editBillItemInput.focus();
        return;
      }

      const amount = elements.editBillAmountInput.value.trim();
      if (amount && !Number.isFinite(Number(amount))) {
        showEditBillError(t('invalidBillAmount'));
        elements.editBillAmountInput.focus();
        return;
      }

      const billData = {
        item,
        amount: Number(amount || 0),
        due_date: elements.editBillDueDateInput.value.trim(),
        pay_before: elements.editBillPayBeforeInput.value.trim(),
        status: elements.editBillStatusInput.value,
      };

      if (pendingEditBill) {
        // Update existing bill
        const updatedBill = await updateBill(pendingEditBill, billData, { showModalError: true });
        if (updatedBill) closeEditModal();
      } else {
        // Create new bill
        const createdBill = await createBill(billData, { showModalError: true });
        if (createdBill) closeEditModal();
      }
    };

    const updateSortHeaders = () => {
      document.querySelectorAll('[data-bill-sort]').forEach((button) => {
        const isActive = button.dataset.billSort === billSort.field;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-sort', isActive ? (billSort.direction === 'asc' ? 'ascending' : 'descending') : 'none');

        const arrow = button.querySelector('.sort-arrow');
        if (arrow) arrow.textContent = isActive ? (billSort.direction === 'asc' ? '^' : 'v') : '<>';
      });
    };

    const setSort = (field) => {
      billSort = {
        field,
        direction: billSort.field === field && billSort.direction === 'asc' ? 'desc' : 'asc',
      };
      render();
    };

    const createSortableHeader = (field, label) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'table-sort-button';
      button.dataset.billSort = field;
      button.addEventListener('click', () => setSort(field));

      const text = document.createElement('span');
      text.textContent = label;

      const arrow = document.createElement('span');
      arrow.className = 'sort-arrow';
      arrow.setAttribute('aria-hidden', 'true');

      button.append(text, arrow);
      return button;
    };

    const renderHeaders = () => {
      const headerCells = document.querySelectorAll('.fast-access-bills-table th');
      const labels = [
        t('billItem'),
        t('amount'),
        t('dueDate'),
        t('payBefore'),
        t('status'),
        t('actions'),
      ];
      const sortableHeaders = {
        1: 'amount',
      };

      headerCells.forEach((cell, index) => {
        cell.innerHTML = '';
        if (sortableHeaders[index]) {
          cell.append(createSortableHeader(sortableHeaders[index], labels[index]));
        } else {
          cell.textContent = labels[index];
        }
      });
      updateSortHeaders();
    };

    const render = () => {
      if (!elements.fastAccessBillsList) return;

      // Helper: days until a date string (negative = overdue)
      const daysUntil = (dateStr) => {
        if (!dateStr) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(`${dateStr}T00:00:00`);
        if (isNaN(d.getTime())) return null;
        return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      };

      // Helper: status badge <span>
      const buildStatusBadge = (status) => {
        const badge = document.createElement('span');
        const normalized = String(status || '').toLowerCase();
        badge.className = `bill-status-badge bill-status-${normalized || 'unpaid'}`;
        badge.textContent = status || t('notAvailable');
        return badge;
      };

      // Helper: date cell with urgency class
      const buildDateCell = (label, dateStr) => {
        const cell = document.createElement('td');
        cell.dataset.label = label;
        if (!dateStr) {
          cell.textContent = t('notAvailable');
          return cell;
        }
        cell.textContent = dateStr;
        const days = daysUntil(dateStr);
        if (days !== null) {
          if (days < 0) cell.classList.add('cc-date-overdue');
          else if (days <= 7) cell.classList.add('cc-date-soon');
        }
        return cell;
      };

      elements.fastAccessBillsList.innerHTML = '';
      getBillGroups().forEach((group) => {
        elements.fastAccessBillsList.append(createBillGroupSummaryRow(group));

        group.bills.forEach((bill) => {
          const status = String(bill.status || '').toLowerCase();
          const row = document.createElement('tr');
          row.className = `bill-row bill-status-row-${status || 'unpaid'}`;

          const itemCell = document.createElement('td');
          itemCell.dataset.label = t('billItem');
          const item = document.createElement('strong');
          item.textContent = bill.item || t('notAvailable');
          itemCell.append(item);

          const amountCell = document.createElement('td');
          amountCell.dataset.label = t('amount');
          const amount = formatters.normalizeAmount(bill.amount);
          amountCell.textContent = formatters.formatCurrency(amount);
          if (amount > 0) amountCell.classList.add('bill-amount-nonzero');

          const dueDateCell = buildDateCell(t('dueDate'), bill.due_date || null);
          const payBeforeCell = buildDateCell(t('payBefore'), bill.pay_before || null);

          const statusCell = document.createElement('td');
          statusCell.dataset.label = t('status');
          statusCell.append(buildStatusBadge(bill.status));

          const actionsCell = document.createElement('td');
          actionsCell.dataset.label = t('actions');
          const actions = document.createElement('div');
          actions.className = 'credit-card-actions';

          if (!bill.readOnly) {
            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'task-action-icon secondary';
            editButton.textContent = '✎';
            editButton.setAttribute('aria-label', t('edit'));
            editButton.title = t('edit');
            editButton.addEventListener('click', () => openEditModal(bill));

            actions.append(editButton);
          }
          actionsCell.append(actions);
          row.append(itemCell, amountCell, dueDateCell, payBeforeCell, statusCell, actionsCell);
          elements.fastAccessBillsList.append(row);
        });
      });

      updateTotals();
      updateSortHeaders();
    };

    return {
      bindExports: () => {
        elements.exportFastAccessBillsCsvButton?.addEventListener('click', exportCsv);
        elements.exportFastAccessBillsPdfButton?.addEventListener('click', exportPdf);
        elements.exportFastAccessBillsExcelButton?.addEventListener('click', exportExcel);
      },
      closeEditModal,
      openEditModal,
      render,
      renderHeaders,
      setBills,
      updateFromModal,
    };
  };

  window.CreditCardFeature = {
    ...(window.CreditCardFeature || {}),
    createFastAccessBills,
  };
}());
