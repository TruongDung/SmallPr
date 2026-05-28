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
    setText('#add-credit-card', t('addCard'));
    if (elements.openAddButton) elements.openAddButton.textContent = t('addCard');
    if (elements.addTitle) elements.addTitle.textContent = t('addCreditCard');
    if (elements.cancelAddButton) elements.cancelAddButton.textContent = t('cancel');
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
    if (elements.cancelEditButton) elements.cancelEditButton.textContent = t('cancel');
    if (elements.saveEditButton) elements.saveEditButton.textContent = t('save');

    if (elements.editBillTitle) elements.editBillTitle.textContent = t('editBill');
    setText('label[for="edit-fast-access-bill-item"]', t('billItem'));
    setText('label[for="edit-fast-access-bill-amount"]', t('amount'));
    setText('label[for="edit-fast-access-bill-due-date"]', t('dueDate'));
    setText('label[for="edit-fast-access-bill-pay-before"]', t('payBefore'));
    setText('label[for="edit-fast-access-bill-status"]', t('status'));
    if (elements.cancelEditBillButton) elements.cancelEditBillButton.textContent = t('cancel');
    if (elements.saveEditBillButton) elements.saveEditBillButton.textContent = t('save');
  };

  window.CreditCardFeature = {
    ...(window.CreditCardFeature || {}),
    applyStaticTranslations,
  };
}());
