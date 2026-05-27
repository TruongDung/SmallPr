(function () {
  const createFastAccessBills = ({ elements, formatters, request, t }) => {
    let bills = [];
    let pendingEditBill = null;

    const showEditBillError = (text) => window.CreditCardFeature.dom.setFieldError(elements.editBillError, text);
    const clearEditBillError = () => window.CreditCardFeature.dom.clearFieldError(elements.editBillError);

    const billGroupKey = (bill) => String(bill.item || '').trim().toLowerCase();

    const setBills = (nextBills) => {
      bills = nextBills || [];
    };

    const updateTotals = () => {
      const rentBill = bills.find((bill) => Number(bill.sort_order) === 1)
        || bills.find((bill) => String(bill.item || '').trim().toLowerCase() === 'rent');
      const rentAmount = rentBill ? formatters.normalizeAmount(rentBill.amount) : 0;
      const totalWithoutRent = bills.reduce((sum, bill) => {
        if (rentBill && bill.id === rentBill.id) return sum;
        return sum + formatters.normalizeAmount(bill.amount);
      }, 0);

      if (elements.fastAccessTotalWithoutRent) {
        elements.fastAccessTotalWithoutRent.textContent = formatters.formatCurrency(totalWithoutRent);
      }
      if (elements.fastAccessRentAmount) {
        elements.fastAccessRentAmount.textContent = formatters.formatCurrency(rentAmount);
      }
      if (elements.fastAccessGrandTotal) {
        elements.fastAccessGrandTotal.textContent = formatters.formatCurrency(totalWithoutRent + rentAmount);
      }
    };

    const getBillGroups = () => {
      const separateBillNames = new Set(['phone', 'auto loan', 'daycare']);
      const groups = [];
      const houseBills = bills.filter((bill) => !separateBillNames.has(billGroupKey(bill)));
      if (houseBills.length) groups.push({ label: t('monthlyBills'), bills: houseBills });

      ['phone', 'auto loan', 'daycare'].forEach((billName) => {
        const matchingBills = bills.filter((bill) => billGroupKey(bill) === billName);
        if (matchingBills.length) {
          groups.push({ label: matchingBills[0].item || t('notAvailable'), bills: matchingBills });
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
      elements.editBillItemInput.value = bill.item || '';
      elements.editBillAmountInput.value = formatters.formatBalanceInput(bill.amount);
      elements.editBillDueDateInput.value = bill.due_date || '';
      elements.editBillPayBeforeInput.value = bill.pay_before || '';
      elements.editBillStatusInput.value = bill.status || 'Unpaid';
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

    const updateFromModal = async () => {
      if (!pendingEditBill) return;
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

      const updatedBill = await updateBill(pendingEditBill, {
        item,
        amount: Number(amount || 0),
        due_date: elements.editBillDueDateInput.value.trim(),
        pay_before: elements.editBillPayBeforeInput.value.trim(),
        status: elements.editBillStatusInput.value,
      }, { showModalError: true });

      if (updatedBill) closeEditModal();
    };

    const render = () => {
      if (!elements.fastAccessBillsList) return;

      elements.fastAccessBillsList.innerHTML = '';
      getBillGroups().forEach((group) => {
        elements.fastAccessBillsList.append(createBillGroupSummaryRow(group));

        group.bills.forEach((bill) => {
          const row = document.createElement('tr');

          const itemCell = document.createElement('td');
          itemCell.dataset.label = t('billItem');
          const item = document.createElement('strong');
          item.textContent = bill.item || t('notAvailable');
          itemCell.append(item);

          const amountCell = document.createElement('td');
          amountCell.dataset.label = t('amount');
          amountCell.textContent = formatters.formatCurrency(bill.amount);

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
          editButton.addEventListener('click', () => openEditModal(bill));

          actions.append(editButton);
          actionsCell.append(actions);
          row.append(itemCell, amountCell, dueDateCell, payBeforeCell, statusCell, actionsCell);
          elements.fastAccessBillsList.append(row);
        });
      });

      updateTotals();
    };

    return {
      closeEditModal,
      render,
      setBills,
      updateFromModal,
    };
  };

  window.CreditCardFeature = {
    ...(window.CreditCardFeature || {}),
    createFastAccessBills,
  };
}());
