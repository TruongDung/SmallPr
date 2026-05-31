const normalizeEmail = (email) => {
  if (email === undefined || email === null) return null;
  const normalized = String(email).trim();
  return normalized || null;
};

const normalizeName = (name) => {
  if (name === undefined || name === null) return null;
  const normalized = String(name).trim();
  return normalized || null;
};

module.exports = {
  normalizeEmail,
  normalizeName,
};
