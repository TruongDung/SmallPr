(function () {
  const issuerLabels = {
    citi: 'Citi',
    amex: 'Amex',
    discover: 'Discover',
    boa: 'BOA',
    chase: 'Chase',
    capital_one: 'Capital One',
    wells_fargo: 'Wells Fargo',
    other: 'Other',
  };

  const createFormatters = ({ t, getLanguage }) => {
    const getLocale = () => (getLanguage() === 'vi' ? 'vi-VN' : 'en-US');

    const formatCurrency = (value) => {
      const amount = Number(value || 0);
      return new Intl.NumberFormat(getLocale(), {
        style: 'currency',
        currency: 'USD',
      }).format(Number.isFinite(amount) ? amount : 0);
    };

    const formatDateOnly = (dateString) => {
      if (!dateString) return t('notAvailable');
      const date = new Date(`${dateString}T00:00:00`);
      if (Number.isNaN(date.getTime())) return t('notAvailable');
      return date.toLocaleDateString(getLocale(), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const formatIssuer = (issuer) => issuerLabels[issuer] || t('notAvailable');

    const formatBalanceInput = (value) => {
      const amount = Number(value || 0);
      return Number.isFinite(amount) ? amount.toFixed(2) : '';
    };

    const normalizeAmount = (value) => {
      const amount = Number(value || 0);
      return Number.isFinite(amount) ? amount : 0;
    };

    const compareText = (first, second) => (
      String(first || '').localeCompare(String(second || ''), getLanguage(), { sensitivity: 'base' })
    );

    return {
      compareText,
      formatBalanceInput,
      formatCurrency,
      formatDateOnly,
      formatIssuer,
      normalizeAmount,
    };
  };

  window.CreditCardFeature = {
    ...(window.CreditCardFeature || {}),
    createFormatters,
  };
}());
