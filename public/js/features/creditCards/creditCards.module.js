(function () {
  const create = ({ request, t, showStatusToast, getLanguage, confirmDelete }) => {
    const feature = window.CreditCardFeature;
    const elements = feature.dom.getElements();
    const formatters = feature.createFormatters({ t, getLanguage });
    const userOptions = feature.createUserOptions({ t, getLanguage });

    let cards = [];
    let pendingEditCard = null;

    const showEditError = (text) => feature.dom.setFieldError(elements.editError, text);
    const clearEditError = () => feature.dom.clearFieldError(elements.editError);

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
    });

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

    const render = (cardsToRender = cards) => {
      cardTable.render(cardsToRender);
    };

    const load = async () => {
      const [cardsResult, usersResult, fastAccessBillsResult] = await Promise.all([
        request('/api/credit-cards'),
        request('/api/credit-cards/users'),
        request('/api/credit-cards/fast-access-bills'),
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
      fastAccessBills.setBills(fastAccessBillsResult.bills || []);
      userOptions.merge(usersResult.users || [], cards);
      userOptions.setOptions(elements.userInput, elements.userInput.value);
      userOptions.setOptions(elements.editUserInput, elements.editUserInput.value);
      elements.message.textContent = '';
      render(cards);
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

      elements.form.addEventListener('submit', handleSubmit);
      elements.openAddButton.addEventListener('click', openAddModal);
      elements.cancelAddButton.addEventListener('click', closeAddModal);
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
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!elements.addModal.classList.contains('hidden')) {
          closeAddModal();
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
      getActiveFinancialTab,
      refreshActivePanel,
    };
  };

  window.CreditCardModule = { create };
}());
