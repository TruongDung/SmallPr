(function () {
  const create = ({ request, t, showStatusToast, getLanguage, isAdminUser, confirmDelete, confirmDeleteFastAccessLink }) => {
    const feature = window.CreditCardFeature;
    const elements = feature.dom.getElements();
    const formatters = feature.createFormatters({ t, getLanguage });
    const userOptions = feature.createUserOptions({ t, getLanguage });

    let cards = [];
    let fastAccessLinks = [];
    let pendingEditCard = null;

    const defaultFastAccessLinks = [
      { label: 'Mortgage', url: 'https://rocket.com/mortgage/' },
      { label: 'Electric', url: 'https://wemc.smarthub.coop/Login.html' },
      { label: 'Water', url: 'https://ubwss.raleighnc.gov/wss/login' },
      { label: 'Gas', url: 'https://account.psncenergy.com/#account-summary' },
      { label: 'Internet', url: 'https://www.spectrum.net/account-summary' },
      { label: 'Phone', url: 'https://www.att.com/acctmgmt/overview' },
    ];

    const showEditError = (text) => feature.dom.setFieldError(elements.editError, text);
    const clearEditError = () => feature.dom.clearFieldError(elements.editError);

    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

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

    const showCardExportError = () => {
      showStatusToast(t('noCreditCardsToExport') || 'No credit cards to export', 'error');
    };

    const creditCardExportFileName = (extension) => `financial-credit-cards-${new Date().toISOString().slice(0, 10)}.${extension}`;

    const creditCardExportRows = () => cards.map(card => ({
      'Card No': card.name || '',
      User: card.card_user || '',
      Type: formatters.formatIssuer(card.issuer),
      Balance: formatters.normalizeAmount(card.total_balance).toFixed(2),
      Interest: formatters.normalizeAmount(card.interest_charge).toFixed(2),
      Close: card.closing_date || '',
    }));

    const getCreditCardTotals = () => cards.reduce((totals, card) => ({
      balance: totals.balance + formatters.normalizeAmount(card.total_balance),
      interest: totals.interest + formatters.normalizeAmount(card.interest_charge),
    }), { balance: 0, interest: 0 });

    const exportCreditCardsCsv = () => {
      const rows = creditCardExportRows();
      if (!rows.length) {
        showCardExportError();
        return;
      }

      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(','),
        ...rows.map(row => headers.map(header => `"${String(row[header]).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      downloadBlob(csv, 'text/csv;charset=utf-8', creditCardExportFileName('csv'));
    };

    const exportCreditCardsExcel = () => {
      const rows = creditCardExportRows();
      if (!rows.length) {
        showCardExportError();
        return;
      }

      const headers = Object.keys(rows[0]);
      const totals = getCreditCardTotals();
      const table = `
        <table>
          <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="3">Total</td><td>${escapeHtml(totals.balance.toFixed(2))}</td><td>${escapeHtml(totals.interest.toFixed(2))}</td><td></td></tr>
          </tfoot>
        </table>
      `;
      downloadBlob(table, 'application/vnd.ms-excel;charset=utf-8', creditCardExportFileName('xls'));
    };

    const exportCreditCardsPdf = () => {
      const rows = creditCardExportRows();
      if (!rows.length) {
        showCardExportError();
        return;
      }

      const headers = Object.keys(rows[0]);
      const totals = getCreditCardTotals();
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showStatusToast('Could not open PDF preview', 'error');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Financial Credit Card Report</title>
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
            <h1>Financial Credit Card Report</h1>
            <p>Total balance: ${escapeHtml(formatters.formatCurrency(totals.balance))} - Total interest: ${escapeHtml(formatters.formatCurrency(totals.interest))}</p>
            <table>
              <thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
              <tbody>${rows.map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`).join('')}</tbody>
              <tfoot><tr><td colspan="3">Total</td><td>${escapeHtml(formatters.formatCurrency(totals.balance))}</td><td>${escapeHtml(formatters.formatCurrency(totals.interest))}</td><td></td></tr></tfoot>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    };

    const openEditModal = (card) => {
      pendingEditCard = card;
      clearEditError();
      elements.editForm.reset();
      elements.editNameInput.value = card.name || '';
      userOptions.setOptions(elements.editUserInput, card.card_user || '');
      elements.editIssuerInput.value = card.issuer || '';
      elements.editBalanceInput.value = formatters.formatBalanceInput(card.total_balance);
      elements.editInterestChargeInput.value = formatters.formatBalanceInput(card.interest_charge);
      elements.editClosingDateInput.value = card.closing_date || '';
      elements.editModal.classList.remove('hidden');
      elements.editNameInput.focus();
      elements.editNameInput.select();
    };

    const cardTable = feature.createCardTable({
      elements,
      formatters,
      t,
      getLanguage,
      onEdit: openEditModal,
      onDelete: (card) => {
        if (typeof confirmDelete === 'function') confirmDelete(card);
      },
    });

    const fastAccessBills = feature.createFastAccessBills({
      elements,
      formatters,
      request,
      t,
      showStatusToast,
    });

    const canUseFastAccessLinks = () => (
      typeof isAdminUser === 'function' && isAdminUser()
    );

    const syncFastAccessLinkAccess = () => {
      const linksTab = elements.financialTabs.find((tab) => tab.dataset.financialTab === 'links');
      const canUseLinks = canUseFastAccessLinks();
      linksTab?.classList.toggle('hidden', !canUseLinks);
      if (linksTab) linksTab.disabled = !canUseLinks;
      if (!canUseLinks && getActiveFinancialTab() === 'links') {
        feature.dom.setActiveFinancialTab({
          tabs: elements.financialTabs,
          panels: elements.financialPanels,
        }, 'cards');
      }
    };

    const closeEditModal = () => {
      pendingEditCard = null;
      clearEditError();
      elements.editForm.reset();
      elements.editModal.classList.add('hidden');
    };

    const updateCard = async () => {
      if (!pendingEditCard) return;
      clearEditError();
      elements.message.textContent = '';

      const name = elements.editNameInput.value.trim();
      if (!name) {
        showEditError(t('creditCardNameRequired'));
        elements.editNameInput.focus();
        return;
      }

      const result = await request(`/api/credit-cards/${pendingEditCard.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          card_user: elements.editUserInput.value,
          issuer: elements.editIssuerInput.value,
          total_balance: elements.editBalanceInput.value,
          interest_charge: elements.editInterestChargeInput.value,
          closing_date: elements.editClosingDateInput.value,
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

    const deleteCard = async (card) => {
      if (!card) return;
      elements.message.textContent = '';

      const result = await request(`/api/credit-cards/${card.id}`, {
        method: 'DELETE',
      });

      if (result.error) {
        elements.message.textContent = result.error;
        return;
      }

      showStatusToast(t('creditCardDeleted'));
      load();
    };

    const deleteFastAccessLink = async (link) => {
      if (!link) return;
      if (!link.id) {
        elements.message.textContent = 'This fast access link cannot be deleted until links are loaded from the server.';
        return;
      }

      elements.message.textContent = '';
      const result = await request(`/api/credit-cards/fast-access-links/${link.id}`, {
        method: 'DELETE',
      });

      if (result.error) {
        elements.message.textContent = result.error;
        return;
      }

      showStatusToast('Fast access link deleted');
      load();
    };

    const render = (cardsToRender = cards) => {
      cardTable.render(cardsToRender);
    };

    const renderFastAccessLinks = () => {
      if (!elements.fastAccessLinksList) return;

      elements.fastAccessLinksList.innerHTML = '';
      if (!canUseFastAccessLinks()) return;
      if (!fastAccessLinks.length) {
        elements.fastAccessLinksList.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem;">No fast access links yet.</td></tr>';
        return;
      }

      fastAccessLinks.forEach((link) => {
        const row = document.createElement('tr');
        const labelCell = document.createElement('td');
        const urlCell = document.createElement('td');
        const actionsCell = document.createElement('td');
        const anchor = document.createElement('a');
        const deleteButton = document.createElement('button');
        const label = link.label || '';
        const url = link.url || '#';
        const canDelete = Boolean(link.id);

        labelCell.textContent = label;
        anchor.className = 'credit-card-link-url';
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.textContent = url;
        urlCell.append(anchor);

        if (canDelete) {
          deleteButton.className = 'task-action-icon danger';
          deleteButton.type = 'button';
          deleteButton.textContent = '\u00d7';
          deleteButton.setAttribute('aria-label', `Delete ${label || 'link'}`);
          deleteButton.title = `Delete ${label || 'link'}`;
          deleteButton.addEventListener('click', () => {
            if (typeof confirmDeleteFastAccessLink === 'function') {
              confirmDeleteFastAccessLink(link);
              return;
            }
            deleteFastAccessLink(link);
          });

          actionsCell.append(deleteButton);
        }

        row.append(labelCell, urlCell, actionsCell);
        elements.fastAccessLinksList.append(row);
      });
    };

    const load = async () => {
      syncFastAccessLinkAccess();
      const shouldLoadFastAccessLinks = canUseFastAccessLinks();
      const [cardsResult, usersResult, fastAccessBillsResult, fastAccessLinksResult] = await Promise.all([
        request('/api/credit-cards'),
        request('/api/credit-cards/users'),
        request('/api/credit-cards/fast-access-bills'),
        shouldLoadFastAccessLinks
          ? request('/api/credit-cards/fast-access-links')
          : Promise.resolve({ links: [] }),
      ]);

      if (cardsResult.error) {
        elements.message.textContent = cardsResult.error;
        return;
      }

      if (usersResult.error) {
        elements.message.textContent = usersResult.error;
        return;
      }

      if (fastAccessBillsResult.error) {
        elements.message.textContent = fastAccessBillsResult.error;
        return;
      }

      cards = cardsResult.cards || [];
      fastAccessLinks = shouldLoadFastAccessLinks
        ? (fastAccessLinksResult.error ? defaultFastAccessLinks : (fastAccessLinksResult.links || []))
        : [];
      fastAccessBills.setBills(fastAccessBillsResult.bills || []);
      userOptions.merge(usersResult.users || [], cards);
      userOptions.setOptions(elements.userInput, elements.userInput.value);
      userOptions.setOptions(elements.editUserInput, elements.editUserInput.value);
      elements.message.textContent = '';
      render(cards);
      renderFastAccessLinks();
      fastAccessBills.render();
    };

    const openAddModal = () => {
      elements.form.reset();
      userOptions.setOptions(elements.userInput);
      elements.message.textContent = '';
      elements.addModal.classList.remove('hidden');
      elements.nameInput.focus();
    };

    const closeAddModal = () => {
      elements.form.reset();
      elements.addModal.classList.add('hidden');
    };

    const openAddFastAccessLinkModal = () => {
      feature.dom.clearFieldError(elements.addFastAccessLinkError);
      elements.addFastAccessLinkForm.reset();
      elements.addFastAccessLinkModal.classList.remove('hidden');
      elements.fastAccessLinkLabelInput.focus();
    };

    const closeAddFastAccessLinkModal = () => {
      feature.dom.clearFieldError(elements.addFastAccessLinkError);
      elements.addFastAccessLinkForm.reset();
      elements.addFastAccessLinkModal.classList.add('hidden');
    };

    const createFastAccessLink = async () => {
      feature.dom.clearFieldError(elements.addFastAccessLinkError);

      const label = elements.fastAccessLinkLabelInput.value.trim();
      const url = elements.fastAccessLinkUrlInput.value.trim();
      if (!label) {
        feature.dom.setFieldError(elements.addFastAccessLinkError, 'Label is required');
        elements.fastAccessLinkLabelInput.focus();
        return;
      }
      if (!url) {
        feature.dom.setFieldError(elements.addFastAccessLinkError, 'URL is required');
        elements.fastAccessLinkUrlInput.focus();
        return;
      }

      const result = await request('/api/credit-cards/fast-access-links', {
        method: 'POST',
        body: JSON.stringify({ label, url }),
      });

      if (result.error) {
        feature.dom.setFieldError(elements.addFastAccessLinkError, result.error);
        return;
      }

      closeAddFastAccessLinkModal();
      showStatusToast('Fast access link added');
      load();
    };

    const handleSubmit = async (event) => {
      event.preventDefault();
      elements.message.textContent = '';

      const name = elements.nameInput.value.trim();
      if (!name) {
        elements.message.textContent = t('creditCardNameRequired');
        elements.nameInput.focus();
        return;
      }

      const result = await request('/api/credit-cards', {
        method: 'POST',
        body: JSON.stringify({
          name,
          card_user: elements.userInput.value,
          issuer: elements.issuerInput.value,
          total_balance: elements.balanceInput.value,
          interest_charge: elements.interestChargeInput.value,
          closing_date: elements.closingDateInput.value,
        }),
      });

      if (result.error) {
        elements.message.textContent = result.error;
        return;
      }

      closeAddModal();
      userOptions.setOptions(elements.userInput);
      showStatusToast(t('creditCardAdded'));
      load();
    };

    const applyTranslations = () => {
      feature.applyStaticTranslations({
        elements,
        setUserOptions: userOptions.setOptions,
        renderHeaders: () => cardTable.renderHeaders(() => cards),
        renderBillsHeaders: () => fastAccessBills.renderHeaders(),
        t,
      });
      render();
      renderFastAccessLinks();
      fastAccessBills.render();
    };

    const getActiveFinancialTab = () => (
      elements.financialTabs.find((tab) => tab.classList.contains('active'))?.dataset.financialTab || 'cards'
    );

    const refreshActivePanel = () => {
      if (getActiveFinancialTab() === 'transactions' && window.transactionsModule) {
        window.transactionsModule.load();
      }
    };

    const reset = () => {
      cards = [];
      fastAccessLinks = [];
      pendingEditCard = null;
      closeAddModal();
      closeAddFastAccessLinkModal();
      closeEditModal();
      fastAccessBills.closeEditModal();
      fastAccessBills.setBills([]);
      elements.message.textContent = '';
      userOptions.setOptions(elements.userInput);
      userOptions.setOptions(elements.editUserInput);
      syncFastAccessLinkAccess();
      render([]);
      renderFastAccessLinks();
      fastAccessBills.render();
    };

    const bind = () => {
      elements.financialTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const tabName = tab.dataset.financialTab;
          feature.dom.setActiveFinancialTab({
            tabs: elements.financialTabs,
            panels: elements.financialPanels,
          }, tabName);

          // Render transactions module when transactions tab is clicked
          if (tabName === 'transactions' && window.transactionsModule) {
            window.transactionsModule.render();
          }
        });
      });

      feature.dom.setActiveFinancialTab({
        tabs: elements.financialTabs,
        panels: elements.financialPanels,
      }, 'cards');
      syncFastAccessLinkAccess();

      elements.form.addEventListener('submit', handleSubmit);
      elements.openAddButton.addEventListener('click', openAddModal);
      elements.cancelAddButton.addEventListener('click', closeAddModal);
      elements.openAddFastAccessLinkButton?.addEventListener('click', openAddFastAccessLinkModal);
      elements.cancelAddFastAccessLinkButton?.addEventListener('click', closeAddFastAccessLinkModal);
      elements.addFastAccessLinkForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        await createFastAccessLink();
      });
      elements.editForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await updateCard();
      });
      elements.editBillForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await fastAccessBills.updateFromModal();
      });
      elements.cancelEditButton.addEventListener('click', closeEditModal);
      elements.cancelEditBillButton.addEventListener('click', fastAccessBills.closeEditModal);
      elements.exportCreditCardsCsvButton?.addEventListener('click', exportCreditCardsCsv);
      elements.exportCreditCardsPdfButton?.addEventListener('click', exportCreditCardsPdf);
      elements.exportCreditCardsExcelButton?.addEventListener('click', exportCreditCardsExcel);
      fastAccessBills.bindExports();
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!elements.addModal.classList.contains('hidden')) {
          closeAddModal();
        }
        if (!elements.addFastAccessLinkModal.classList.contains('hidden')) {
          closeAddFastAccessLinkModal();
        }
        if (!elements.editModal.classList.contains('hidden')) {
          closeEditModal();
        }
        if (!elements.editBillModal.classList.contains('hidden')) {
          fastAccessBills.closeEditModal();
        }
      });
    };

    return {
      applyTranslations,
      bind,
      load,
      render,
      deleteCard,
      deleteFastAccessLink,
      getActiveFinancialTab,
      refreshActivePanel,
      reset,
    };
  };

  window.CreditCardModule = { create };
}());
