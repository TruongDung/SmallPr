(function () {
  const translateQuickLinks = (t) => {
    document.querySelectorAll('.credit-card-link[data-i18n-key]').forEach((link) => {
      link.textContent = t(link.dataset.i18nKey);
    });
  };

  const applyStaticTranslations = ({ elements, setUserOptions, renderHeaders, renderBillsHeaders, t }) => {
    const { setText } = window.CreditCardFeature.dom;

    setText('#credit-card-title', t('creditCardAccounts'));
    setText('#credit-card-tab', t('creditCardSubTab'));
    setText('#credit-card-info-tab', t('creditCardInfoSubTab'));
    setText('#credit-card-quick-links-title', t('fastAccessLinks'));
    setText('#fast-access-bills-title', t('monthlyBills'));
    renderBillsHeaders();
    setText('#fast-access-grand-total-label', t('grandTotalIncludingRent'));
    translateQuickLinks(t);

    setText('label[for="credit-card-name"]', t('cardName'));
    elements.nameInput.placeholder = t('cardNamePlaceholder');
    setText('label[for="credit-card-user"]', t('creditCardUser'));
    setUserOptions(elements.userInput, elements.userInput.value);
    setText('label[for="credit-card-issuer"]', t('creditCardIssuer'));
    setText('label[for="credit-card-balance"]', t('totalBalance'));
    setText('label[for="credit-card-interest-charge"]', t('interestCharge'));
    setText('label[for="credit-card-closing-date"]', t('closingDate'));
    if (elements.addSubmitButton) {
      elements.addSubmitButton.className = 'task-action-icon';
      elements.addSubmitButton.textContent = '✓';
      elements.addSubmitButton.setAttribute('aria-label', t('addCard'));
      elements.addSubmitButton.title = t('addCard');
    }
    if (elements.openAddButton) {
      elements.openAddButton.textContent = '+';
      elements.openAddButton.setAttribute('aria-label', t('addCard'));
      elements.openAddButton.title = t('addCard');
    }
    if (elements.addTitle) elements.addTitle.textContent = t('addCreditCard');
    if (elements.cancelAddButton) {
      elements.cancelAddButton.className = 'task-action-icon secondary';
      elements.cancelAddButton.textContent = '×';
      elements.cancelAddButton.setAttribute('aria-label', t('cancel'));
      elements.cancelAddButton.title = t('cancel');
    }
    renderHeaders();

    if (elements.editTitle) elements.editTitle.textContent = t('editCreditCard');
    setText('label[for="edit-credit-card-name"]', t('cardName'));
    elements.editNameInput.placeholder = t('cardNamePlaceholder');
    setText('label[for="edit-credit-card-user"]', t('creditCardUser'));
    setUserOptions(elements.editUserInput, elements.editUserInput.value);
    setText('label[for="edit-credit-card-issuer"]', t('creditCardIssuer'));
    setText('label[for="edit-credit-card-balance"]', t('totalBalance'));
    setText('label[for="edit-credit-card-interest-charge"]', t('interestCharge'));
    setText('label[for="edit-credit-card-closing-date"]', t('closingDate'));
    if (elements.cancelEditButton) {
      elements.cancelEditButton.className = 'task-action-icon secondary';
      elements.cancelEditButton.textContent = '×';
      elements.cancelEditButton.setAttribute('aria-label', t('cancel'));
      elements.cancelEditButton.title = t('cancel');
    }
    if (elements.saveEditButton) {
      elements.saveEditButton.className = 'task-action-icon';
      elements.saveEditButton.textContent = '✓';
      elements.saveEditButton.setAttribute('aria-label', t('save'));
      elements.saveEditButton.title = t('save');
    }

    if (elements.editBillTitle) elements.editBillTitle.textContent = t('editBill');
    setText('label[for="edit-fast-access-bill-item"]', t('billItem'));
    setText('label[for="edit-fast-access-bill-amount"]', t('amount'));
    setText('label[for="edit-fast-access-bill-due-date"]', t('dueDate'));
    setText('label[for="edit-fast-access-bill-pay-before"]', t('payBefore'));
    setText('label[for="edit-fast-access-bill-status"]', t('status'));
    if (elements.cancelEditBillButton) {
      elements.cancelEditBillButton.className = 'task-action-icon secondary';
      elements.cancelEditBillButton.textContent = '×';
      elements.cancelEditBillButton.setAttribute('aria-label', t('cancel'));
      elements.cancelEditBillButton.title = t('cancel');
    }
    if (elements.saveEditBillButton) {
      elements.saveEditBillButton.className = 'task-action-icon';
      elements.saveEditBillButton.textContent = '✓';
      elements.saveEditBillButton.setAttribute('aria-label', t('save'));
      elements.saveEditBillButton.title = t('save');
    }
  };

  window.CreditCardFeature = {
    ...(window.CreditCardFeature || {}),
    applyStaticTranslations,
  };
}());
