const { z } = require('zod');

const {
  TRANSACTION_KINDS,
  MAX_TRANSACTION_CATEGORY_LENGTH,
  MAX_TRANSACTION_ACCOUNT_LENGTH,
  MAX_TRANSACTION_NOTE_LENGTH,
} = require('../constants/transactions');

const MAX_AMOUNT = 9999999999.99;

// --- Reusable field schemas -------------------------------------------------
// Each field accepts the loose input that arrives over JSON (strings, numbers,
// nullish) and normalizes it to the shape the service layer expects, while
// surfacing the same human-readable messages the route used to return.

const dateField = z
  .any()
  .transform((value) => String(value ?? '').trim())
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Date is required and must be in YYYY-MM-DD format',
  });

const kindField = z
  .any()
  .transform((value) => String(value ?? '').trim())
  .refine((value) => TRANSACTION_KINDS.includes(value), {
    message: 'Kind must be income or expense',
  });

const amountField = z
  .any()
  .transform((value) => (value === '' || value === null || value === undefined ? NaN : Number(value)))
  .refine((value) => Number.isFinite(value) && value > 0 && value <= MAX_AMOUNT, {
    message: 'Amount must be a valid positive number',
  })
  .transform((value) => Math.round(value * 100) / 100);

const textField = (max, label) =>
  z
    .any()
    .transform((value) => String(value ?? '').trim())
    .refine((value) => value.length <= max, {
      message: `${label} must be ${max} characters or less`,
    });

const creditCardIdField = z.any().transform((value) => (value ? Number(value) : null));

const categoryField = textField(MAX_TRANSACTION_CATEGORY_LENGTH, 'Category');
const accountField = textField(MAX_TRANSACTION_ACCOUNT_LENGTH, 'Account');
const noteField = textField(MAX_TRANSACTION_NOTE_LENGTH, 'Note');

// --- Body schemas -----------------------------------------------------------

// Create requires date/kind/amount; the remaining fields default to empty/null
// when omitted, mirroring the previous inline behavior. Output keys are
// camelCased to match the transactions service signature.
const createTransactionSchema = z
  .object({
    occurred_on: dateField.optional(),
    kind: kindField.optional(),
    amount: amountField.optional(),
    category: categoryField.optional(),
    account: accountField.optional(),
    note: noteField.optional(),
    credit_card_id: creditCardIdField.optional(),
  })
  // A present-but-invalid required field already fails at the field level with
  // the right message; this only covers the omitted-entirely case so the same
  // messages surface instead of Zod's generic "required" text.
  .superRefine((data, ctx) => {
    if (data.occurred_on === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Date is required and must be in YYYY-MM-DD format' });
    }
    if (data.kind === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Kind must be income or expense' });
    }
    if (data.amount === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Amount must be a valid positive number' });
    }
  })
  .transform((data) => ({
    occurredOn: data.occurred_on,
    kind: data.kind,
    amount: data.amount,
    category: data.category ?? '',
    account: data.account ?? '',
    note: data.note ?? '',
    creditCardId: data.credit_card_id ?? null,
  }));

// Update validates only the fields that are present; omitted fields are left out
// of the result so the route can merge them onto the existing transaction.
const updateTransactionSchema = z
  .object({
    occurred_on: dateField.optional(),
    kind: kindField.optional(),
    amount: amountField.optional(),
    category: categoryField.optional(),
    account: accountField.optional(),
    note: noteField.optional(),
    credit_card_id: creditCardIdField.optional(),
  })
  .transform((data) => {
    const values = {};
    if (data.occurred_on !== undefined) values.occurredOn = data.occurred_on;
    if (data.kind !== undefined) values.kind = data.kind;
    if (data.amount !== undefined) values.amount = data.amount;
    if (data.category !== undefined) values.category = data.category;
    if (data.account !== undefined) values.account = data.account;
    if (data.note !== undefined) values.note = data.note;
    if (data.credit_card_id !== undefined) values.creditCardId = data.credit_card_id;
    return values;
  });

// --- Query schema -----------------------------------------------------------
// GET / filters: each filter is optional and only validated when supplied.
const transactionQuerySchema = z
  .object({
    month: z
      .any()
      .optional()
      .transform((value) => (value === undefined || value === '' ? undefined : Number(value)))
      .refine((value) => value === undefined || (Number.isFinite(value) && value >= 1 && value <= 12), {
        message: 'Month must be a number between 1 and 12',
      }),
    year: z
      .any()
      .optional()
      .transform((value) => (value === undefined || value === '' ? undefined : Number(value)))
      .refine((value) => value === undefined || (Number.isFinite(value) && value >= 2000 && value <= 2100), {
        message: 'Year must be a number between 2000 and 2100',
      }),
    kind: z
      .any()
      .optional()
      .refine((value) => value === undefined || value === '' || TRANSACTION_KINDS.includes(value), {
        message: 'Kind must be income or expense',
      })
      .transform((value) => (value === '' ? undefined : value)),
    category: z
      .any()
      .optional()
      .transform((value) => {
        if (value === undefined || value === null) return undefined;
        const trimmed = String(value).trim().slice(0, MAX_TRANSACTION_CATEGORY_LENGTH);
        return trimmed || undefined;
      }),
  })
  .transform((data) => {
    const filters = {};
    if (data.month !== undefined) filters.month = data.month;
    if (data.year !== undefined) filters.year = data.year;
    if (data.kind !== undefined) filters.kind = data.kind;
    if (data.category !== undefined) filters.category = data.category;
    return filters;
  });

// Merge a validated partial update onto the existing transaction record so the
// service receives a complete set of values. Mirrors the previous "fall back to
// existing value" behavior, normalizing the existing record's fields the same
// way the create path does.
const mergeTransactionValues = (existing, updates) => ({
  occurredOn: updates.occurredOn !== undefined ? updates.occurredOn : existing.occurred_on,
  kind: updates.kind !== undefined ? updates.kind : existing.kind,
  amount: updates.amount !== undefined ? updates.amount : Number(existing.amount),
  category: updates.category !== undefined ? updates.category : String(existing.category || '').trim(),
  account: updates.account !== undefined ? updates.account : String(existing.account || '').trim(),
  note: updates.note !== undefined ? updates.note : String(existing.note || '').trim(),
  creditCardId: updates.creditCardId !== undefined ? updates.creditCardId : existing.credit_card_id || null,
});

module.exports = {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
  mergeTransactionValues,
};
