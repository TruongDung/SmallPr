const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const logger = require('../../logger');
const { createStatementImportService } = require('../statementImport.service');

const DEFAULT_CASES_DIR = path.join(process.cwd(), 'evaluations', 'statement-import', 'cases');
const DEFAULT_REPORTS_DIR = path.join(process.cwd(), 'evaluations', 'statement-import', 'reports');

const DEFAULT_THRESHOLDS = {
  overallAccuracy: 0.9,
  dateAccuracy: 0.95,
  amountAccuracy: 0.98,
  merchantAccuracy: 0.85,
  categoryAccuracy: 0.8,
  duplicateDetectionAccuracy: 0.9,
  parseFailureRate: 0.05,
};

const DEFAULT_COST_PER_1K_INPUT_TOKENS_USD = Number(process.env.EVAL_INPUT_COST_PER_1K_TOKENS_USD || 0);
const DEFAULT_COST_PER_1K_OUTPUT_TOKENS_USD = Number(process.env.EVAL_OUTPUT_COST_PER_1K_TOKENS_USD || 0);

const round = (value, digits = 4) => {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value) =>
  normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 1);

const jaccardSimilarity = (a, b) => {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (!left.size && !right.size) return 1;
  if (!left.size || !right.size) return 0;

  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
};

const merchantMatches = (expected, actual) => {
  const expectedText = normalizeText(expected);
  const actualText = normalizeText(actual);
  if (!expectedText || !actualText) return false;
  return (
    expectedText === actualText ||
    expectedText.includes(actualText) ||
    actualText.includes(expectedText) ||
    jaccardSimilarity(expectedText, actualText) >= 0.5
  );
};

const dateMatches = (expected, actual) => String(expected || '') === String(actual || '');
const amountMatches = (expected, actual) => Math.abs(Number(expected) - Number(actual)) <= 0.01;
const categoryMatches = (expected, actual) => normalizeText(expected) === normalizeText(actual);

const canonicalActual = (item) => ({
  date: item?.date || item?.occurredOn || item?.occurred_on || '',
  amount: Number(item?.amount),
  merchant: item?.merchant || item?.description || item?.category || item?.note || '',
  category: item?.category || '',
  duplicate: Boolean(item?.duplicate || item?.isDuplicate || item?.is_duplicate),
  raw: item,
});

const canonicalExpected = (item) => ({
  date: item?.date || item?.occurredOn || item?.occurred_on || '',
  amount: Number(item?.amount),
  merchant: item?.merchant || item?.description || item?.category || item?.note || '',
  category: item?.category || item?.merchant || item?.description || '',
  duplicate: Boolean(item?.duplicate || item?.isDuplicate || item?.is_duplicate),
  raw: item,
});

const candidateScore = (expected, actual) => {
  let score = 0;
  if (dateMatches(expected.date, actual.date)) score += 4;
  if (amountMatches(expected.amount, actual.amount)) score += 4;
  if (merchantMatches(expected.merchant, actual.merchant)) score += 2;
  if (categoryMatches(expected.category, actual.category)) score += 1;
  return score;
};

const findBestActual = (expected, actualItems, usedIndexes) => {
  let best = null;

  actualItems.forEach((actual, index) => {
    if (usedIndexes.has(index)) return;
    const score = candidateScore(expected, actual);
    if (score === 0) return;
    if (!best || score > best.score) {
      best = { actual, index, score };
    }
  });

  return best;
};

const emptyCounters = () => ({
  totalExpected: 0,
  totalActual: 0,
  matched: 0,
  missing: 0,
  unexpected: 0,
  dateCorrect: 0,
  amountCorrect: 0,
  merchantCorrect: 0,
  categoryCorrect: 0,
  duplicateCorrect: 0,
  duplicateTotal: 0,
  parseFailures: 0,
});

const summarizeCounters = (counters, caseCount, durationMs, estimatedCostUsd) => {
  const fieldDenominator = Math.max(counters.totalExpected - counters.duplicateTotal, 1);
  const overallFields = fieldDenominator * 4;
  const overallCorrect =
    counters.dateCorrect + counters.amountCorrect + counters.merchantCorrect + counters.categoryCorrect;
  const duplicateAccuracy = counters.duplicateTotal === 0 ? 1 : counters.duplicateCorrect / counters.duplicateTotal;

  return {
    caseCount,
    totalExpected: counters.totalExpected,
    totalActual: counters.totalActual,
    matched: counters.matched,
    missing: counters.missing,
    unexpected: counters.unexpected,
    parseFailures: counters.parseFailures,
    parseFailureRate: round(counters.parseFailures / Math.max(caseCount, 1)),
    dateAccuracy: round(counters.dateCorrect / fieldDenominator),
    amountAccuracy: round(counters.amountCorrect / fieldDenominator),
    merchantAccuracy: round(counters.merchantCorrect / fieldDenominator),
    categoryAccuracy: round(counters.categoryCorrect / fieldDenominator),
    duplicateDetectionAccuracy: round(duplicateAccuracy),
    overallAccuracy: round(overallCorrect / Math.max(overallFields, 1)),
    latencyMs: round(durationMs, 2),
    averageLatencyMs: round(durationMs / Math.max(caseCount, 1), 2),
    estimatedCostUsd: round(estimatedCostUsd, 6),
  };
};

const evaluateExpectedAgainstActual = ({ expectedTransactions, actualTransactions, parseError }) => {
  const expectedItems = expectedTransactions.map(canonicalExpected);
  const actualItems = actualTransactions.map(canonicalActual);
  const usedActualIndexes = new Set();
  const counters = emptyCounters();
  const comparisons = [];

  counters.totalExpected = expectedItems.length;
  counters.totalActual = actualItems.length;
  counters.parseFailures = parseError ? 1 : 0;

  expectedItems.forEach((expected, expectedIndex) => {
    if (expected.duplicate) {
      const duplicateWasDropped = !actualItems.some(
        (actual, actualIndex) =>
          !usedActualIndexes.has(actualIndex) &&
          dateMatches(expected.date, actual.date) &&
          amountMatches(expected.amount, actual.amount) &&
          merchantMatches(expected.merchant, actual.merchant),
      );
      counters.duplicateTotal += 1;
      if (duplicateWasDropped) counters.duplicateCorrect += 1;
      comparisons.push({
        expectedIndex,
        status: duplicateWasDropped ? 'duplicate-dropped' : 'duplicate-returned',
        expected,
        actual: duplicateWasDropped ? null : 'present',
        fields: { duplicate: duplicateWasDropped },
      });
      return;
    }

    const best = findBestActual(expected, actualItems, usedActualIndexes);
    if (!best) {
      counters.missing += 1;
      comparisons.push({
        expectedIndex,
        status: 'missing',
        expected,
        actual: null,
        fields: {
          date: false,
          amount: false,
          merchant: false,
          category: false,
        },
      });
      return;
    }

    usedActualIndexes.add(best.index);
    counters.matched += 1;

    const fields = {
      date: dateMatches(expected.date, best.actual.date),
      amount: amountMatches(expected.amount, best.actual.amount),
      merchant: merchantMatches(expected.merchant, best.actual.merchant),
      category: categoryMatches(expected.category, best.actual.category),
    };

    if (fields.date) counters.dateCorrect += 1;
    if (fields.amount) counters.amountCorrect += 1;
    if (fields.merchant) counters.merchantCorrect += 1;
    if (fields.category) counters.categoryCorrect += 1;

    comparisons.push({
      expectedIndex,
      actualIndex: best.index,
      status: Object.values(fields).every(Boolean) ? 'pass' : 'field-mismatch',
      matchScore: best.score,
      expected,
      actual: best.actual,
      fields,
    });
  });

  const unexpected = actualItems
    .map((actual, index) => ({ actual, index }))
    .filter(({ index }) => !usedActualIndexes.has(index));
  counters.unexpected = unexpected.length;

  return {
    counters,
    comparisons,
    unexpected,
  };
};

const estimateTokens = (value) => Math.ceil(String(value || '').length / 4);

const estimateCost = ({ inputText, actualTransactions, usage }) => {
  const inputTokens = usage?.inputTokens ?? usage?.prompt_tokens ?? estimateTokens(inputText);
  const outputText = JSON.stringify(actualTransactions || []);
  const outputTokens = usage?.outputTokens ?? usage?.completion_tokens ?? estimateTokens(outputText);

  const inputCost = (inputTokens / 1000) * DEFAULT_COST_PER_1K_INPUT_TOKENS_USD;
  const outputCost = (outputTokens / 1000) * DEFAULT_COST_PER_1K_OUTPUT_TOKENS_USD;

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCostUsd: inputCost + outputCost,
  };
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const loadEvaluationCases = (casesDir = DEFAULT_CASES_DIR) => {
  if (!fs.existsSync(casesDir)) return [];

  return fs
    .readdirSync(casesDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const filePath = path.join(casesDir, file);
      return {
        id: path.basename(file, '.json'),
        filePath,
        ...readJson(filePath),
      };
    });
};

const loadCaseInput = (testCase) => {
  if (testCase.inputText) return { text: testCase.inputText };
  if (testCase.inputTextPath) {
    const textPath = path.resolve(path.dirname(testCase.filePath), testCase.inputTextPath);
    return { text: fs.readFileSync(textPath, 'utf8') };
  }
  if (testCase.pdfBase64) return { base64Pdf: testCase.pdfBase64 };
  if (testCase.pdfPath) {
    const pdfPath = path.resolve(path.dirname(testCase.filePath), testCase.pdfPath);
    return { base64Pdf: fs.readFileSync(pdfPath).toString('base64') };
  }
  return { text: '' };
};

const createDefaultParser = () => {
  const statementImport = createStatementImportService();
  return async (input) => {
    if (input.base64Pdf) return statementImport.parseStatement(input);
    return statementImport.parseStatementTextForEvaluation({ text: input.text });
  };
};

const passesThresholds = (summary, thresholds = DEFAULT_THRESHOLDS) => {
  const failures = [];
  Object.entries(thresholds).forEach(([metric, threshold]) => {
    const value = summary[metric];
    if (typeof value !== 'number') return;

    const passed = metric === 'parseFailureRate' ? value <= threshold : value >= threshold;
    if (!passed) failures.push({ metric, value, threshold });
  });

  return {
    passed: failures.length === 0,
    failures,
  };
};

const compareWithPreviousRun = (currentSummary, previousReport) => {
  if (!previousReport?.summary) return [];

  const metrics = [
    'overallAccuracy',
    'dateAccuracy',
    'amountAccuracy',
    'merchantAccuracy',
    'categoryAccuracy',
    'duplicateDetectionAccuracy',
    'parseFailureRate',
    'averageLatencyMs',
    'estimatedCostUsd',
  ];

  return metrics
    .map((metric) => {
      const previous = Number(previousReport.summary[metric]);
      const current = Number(currentSummary[metric]);
      if (!Number.isFinite(previous) || !Number.isFinite(current)) return null;
      const delta = round(current - previous);
      const lowerIsBetter = ['parseFailureRate', 'averageLatencyMs', 'estimatedCostUsd'].includes(metric);
      const regressed = lowerIsBetter ? delta > 0 : delta < 0;
      return { metric, previous, current, delta, regressed };
    })
    .filter(Boolean);
};

const isBlockingRegression = (regression) => !['averageLatencyMs', 'estimatedCostUsd'].includes(regression.metric);

const createEvaluationReport = async ({
  cases,
  parser = createDefaultParser(),
  previousReport = null,
  thresholds = DEFAULT_THRESHOLDS,
} = {}) => {
  const loadedCases = cases || loadEvaluationCases();
  const reportStartedAt = new Date();
  const aggregate = emptyCounters();
  let totalCost = 0;

  const testCases = [];

  for (const testCase of loadedCases) {
    const startedAt = performance.now();
    const input = loadCaseInput(testCase);
    let result;
    let thrownError = null;

    try {
      result = await parser(input, testCase);
    } catch (error) {
      thrownError = error;
      logger.error({ err: error, caseId: testCase.id }, 'Evaluation parser threw');
      result = { error: error.message || 'Parser threw an error' };
    }

    const latencyMs = performance.now() - startedAt;
    const actualTransactions = Array.isArray(result?.items) ? result.items : [];
    const parseError = result?.error || thrownError?.message || null;
    const expectedTransactions = Array.isArray(testCase.expectedTransactions) ? testCase.expectedTransactions : [];
    const evaluation = evaluateExpectedAgainstActual({
      expectedTransactions,
      actualTransactions,
      parseError,
    });
    const cost = estimateCost({
      inputText: input.text || testCase.pdfPath || '',
      actualTransactions,
      usage: result?.usage,
    });

    totalCost += cost.estimatedCostUsd;
    Object.keys(aggregate).forEach((key) => {
      aggregate[key] += evaluation.counters[key] || 0;
    });

    const caseSummary = summarizeCounters(evaluation.counters, 1, latencyMs, cost.estimatedCostUsd);
    const caseThresholds = passesThresholds(caseSummary, testCase.thresholds || thresholds);

    testCases.push({
      id: testCase.id,
      name: testCase.name || testCase.id,
      source: testCase.pdfPath ? 'pdf' : 'text',
      status: caseThresholds.passed && !parseError ? 'pass' : 'fail',
      parseError,
      summary: {
        ...caseSummary,
        latencyMs: round(latencyMs, 2),
        tokenUsage: {
          inputTokens: cost.inputTokens,
          outputTokens: cost.outputTokens,
          totalTokens: cost.totalTokens,
        },
      },
      thresholdFailures: caseThresholds.failures,
      comparisons: evaluation.comparisons,
      unexpected: evaluation.unexpected,
    });
  }

  const totalLatencyMs = testCases.reduce((sum, testCase) => sum + testCase.summary.latencyMs, 0);
  const summary = summarizeCounters(aggregate, loadedCases.length, totalLatencyMs, totalCost);
  const thresholdResult = passesThresholds(summary, thresholds);
  const regressions = compareWithPreviousRun(summary, previousReport).filter((item) => item.regressed);
  const blockingRegressions = regressions.filter(isBlockingRegression);

  return {
    id: `statement-import-${reportStartedAt.toISOString().replace(/[:.]/g, '-')}`,
    feature: 'statement-import',
    startedAt: reportStartedAt.toISOString(),
    completedAt: new Date().toISOString(),
    status: thresholdResult.passed && blockingRegressions.length === 0 ? 'pass' : 'fail',
    summary,
    thresholds,
    thresholdFailures: thresholdResult.failures,
    blockingRegressions,
    regressions,
    regressionDeltas: compareWithPreviousRun(summary, previousReport),
    testCases,
  };
};

const loadLatestReport = (reportsDir = DEFAULT_REPORTS_DIR) => {
  const latestPath = path.join(reportsDir, 'latest.json');
  if (!fs.existsSync(latestPath)) return null;
  return readJson(latestPath);
};

const writeEvaluationReport = (report, reportsDir = DEFAULT_REPORTS_DIR) => {
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, `${report.id}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`);
  return reportPath;
};

module.exports = {
  DEFAULT_CASES_DIR,
  DEFAULT_REPORTS_DIR,
  DEFAULT_THRESHOLDS,
  compareWithPreviousRun,
  createEvaluationReport,
  evaluateExpectedAgainstActual,
  loadEvaluationCases,
  loadLatestReport,
  merchantMatches,
  passesThresholds,
  writeEvaluationReport,
};
