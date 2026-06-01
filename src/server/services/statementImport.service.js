const Anthropic = require('@anthropic-ai/sdk');

const {
  MAX_TRANSACTION_CATEGORY_LENGTH,
  MAX_TRANSACTION_NOTE_LENGTH,
} = require('../constants/transactions');

// Sonnet handles multi-page statement layouts well at a reasonable cost.
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8000;

const SYSTEM_PROMPT = `You extract purchase line items from a credit card statement PDF.
Return ONLY real purchases/charges made by the cardholder.
EXCLUDE: payments, statement credits, refunds, returns, balance transfers,
interest charges, fees summaries, rewards, and any subtotal/total lines.
For each purchase, capture the transaction date (NOT the posting date when both
are shown), the merchant/description, and the amount as a positive number.
If the year is missing from a date, infer it from the statement period.`;

// A single tool whose input schema is the structured result we want back.
// Forcing this tool guarantees valid JSON instead of free-form prose.
const EXTRACT_TOOL = {
  name: 'record_statement_items',
  description: 'Record the purchase line items extracted from the statement.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Transaction date in YYYY-MM-DD format.',
            },
            description: {
              type: 'string',
              description: 'Merchant name or transaction description.',
            },
            amount: {
              type: 'number',
              description: 'Charge amount as a positive number.',
            },
          },
          required: ['date', 'description', 'amount'],
        },
      },
    },
    required: ['items'],
  },
};

const isValidDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

// Keep only well-formed rows and clamp text to the transaction column limits so
// the downstream create validation never rejects an imported row on length.
const normalizeItems = (rawItems) => (Array.isArray(rawItems) ? rawItems : [])
  .map((item) => {
    const amount = Number(item?.amount);
    if (!isValidDate(item?.date) || !Number.isFinite(amount) || amount <= 0) {
      return null;
    }
    const description = String(item?.description || '').trim();
    return {
      date: item.date,
      // The merchant is the natural category; full text goes to the note.
      category: description.slice(0, MAX_TRANSACTION_CATEGORY_LENGTH),
      note: description.slice(0, MAX_TRANSACTION_NOTE_LENGTH),
      amount: Math.round(amount * 100) / 100,
    };
  })
  .filter(Boolean);

const createStatementImportService = ({ apiKey }) => {
  const isConfigured = () => Boolean(apiKey);

  const parseStatement = async ({ base64Pdf }) => {
    if (!apiKey) {
      return { error: 'AI import is not configured. Set ANTHROPIC_API_KEY to enable PDF import.' };
    }
    if (!base64Pdf) {
      return { error: 'No PDF provided.' };
    }

    const client = new Anthropic({ apiKey });

    let message;
    try {
      message = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        tools: [EXTRACT_TOOL],
        tool_choice: { type: 'tool', name: 'record_statement_items' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
              },
              { type: 'text', text: 'Extract the purchase line items from this statement.' },
            ],
          },
        ],
      });
    } catch (error) {
      console.error('Statement parse request failed:', error?.message || error);
      return { error: 'Failed to read the statement. Please try again or enter the items manually.' };
    }

    const toolUse = message.content.find((block) => block.type === 'tool_use');
    if (!toolUse) {
      // The model answered with prose instead of the forced tool call — usually
      // a misconfigured key/proxy or a refusal. Log the text to aid debugging.
      const textBlock = message.content.find((block) => block.type === 'text');
      if (textBlock) {
        console.error('Statement parse returned no tool_use. Model said:', textBlock.text);
      }
      return { error: 'Could not read any transactions from this statement.' };
    }

    const items = normalizeItems(toolUse.input?.items);
    return { items };
  };

  return { isConfigured, parseStatement };
};

module.exports = {
  createStatementImportService,
};
