(function () {
  const excludedCardUserNames = new Set(['admin', 'card holder']);

  const isAllowedCardUser = (name) => {
    const normalizedName = String(name || '')
      .trim()
      .toLowerCase();
    return normalizedName && !excludedCardUserNames.has(normalizedName);
  };

  const createUserOptions = ({ t, getLanguage }) => {
    let users = [];

    const merge = (savedUsers = [], cards = []) => {
      const names = [...savedUsers, ...cards.map((card) => card.card_user)]
        .map((name) => String(name || '').trim())
        .filter(isAllowedCardUser);

      users = [...new Set(names)].sort((first, second) =>
        first.localeCompare(second, getLanguage(), { sensitivity: 'base' }),
      );
      return users;
    };

    const setOptions = (select, selectedValue = '') => {
      if (!select) return;

      const normalizedSelectedValue = String(selectedValue || '').trim();
      const optionValues =
        isAllowedCardUser(normalizedSelectedValue) && !users.includes(normalizedSelectedValue)
          ? [normalizedSelectedValue, ...users]
          : users;

      select.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = t('creditCardUserPlaceholder');
      select.append(placeholder);

      optionValues.forEach((user) => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        select.append(option);
      });

      select.value = isAllowedCardUser(normalizedSelectedValue) ? normalizedSelectedValue : '';
    };

    return {
      merge,
      setOptions,
    };
  };

  window.CreditCardFeature = {
    ...(window.CreditCardFeature || {}),
    createUserOptions,
  };
})();
