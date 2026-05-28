const normalizeCreditCardBalance = (balance) => {
  if (balance === undefined || balance === null || balance === '') {
    return 0;
  }

  const normalized = Number(balance);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 9999999999.99) {
    return null;
  }

  return Math.round(normalized * 100) / 100;
};

const normalizeCreditCardInterestCharge = (interestCharge) => normalizeCreditCardBalance(interestCharge);

const normalizeClosingDate = (closingDate) => {
  if (closingDate === undefined || closingDate === null || closingDate === '') {
    return '';
  }

  const normalized = String(closingDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    return null;
  }

  return normalized;
};

const normalizeCreditCardUser = (cardUser) => {
  if (cardUser === undefined || cardUser === null) {
    return '';
  }

  return String(cardUser).trim();
};

const normalizeCreditCardIssuer = (issuer, allowedIssuers) => {
  if (issuer === undefined || issuer === null || issuer === '') {
    return '';
  }

  const normalized = String(issuer).trim().toLowerCase();
  return allowedIssuers.includes(normalized) ? normalized : null;
};

module.exports = {
  normalizeClosingDate,
  normalizeCreditCardBalance,
  normalizeCreditCardInterestCharge,
  normalizeCreditCardIssuer,
  normalizeCreditCardUser,
};
