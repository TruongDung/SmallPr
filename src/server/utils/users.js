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

const createSessionUser = (user, impersonator = null) => ({
  id: user.id,
  username: user.username,
  name: user.name,
  email: user.email,
  timezone: user.timezone,
  language: user.language,
  account_status: user.account_status,
  impersonator: impersonator ? {
    id: impersonator.id,
    username: impersonator.username,
    name: impersonator.name,
    email: impersonator.email,
  } : null,
});

module.exports = {
  createSessionUser,
  normalizeEmail,
  normalizeName,
};
