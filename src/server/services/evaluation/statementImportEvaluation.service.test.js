const {
  createEvaluationReport,
  evaluateExpectedAgainstActual,
  merchantMatches,
} = require('./statementImportEvaluation.service');

describe('statement import evaluation service', () => {
  test('matches merchant names fuzzily', () => {
    expect(merchantMatches('WHOLE FOODS MARKET 10245 AUSTIN TX', 'Whole Foods Market')).toBe(true);
    expect(merchantMatches('SQ *LOCAL COFFEE SHOP', 'Local Coffee Shop')).toBe(true);
    expect(merchantMatches('TARGET T-2331', 'Spotify USA')).toBe(false);
  });

  test('scores field-level transaction accuracy and duplicate drops', () => {
    const result = evaluateExpectedAgainstActual({
      expectedTransactions: [
        {
          date: '2025-02-02',
          amount: 126.44,
          merchant: 'COSTCO WHSE #0681 PLANO TX',
          category: 'COSTCO WHSE #0681 PLANO TX',
        },
        {
          date: '2025-02-02',
          amount: 126.44,
          merchant: 'COSTCO WHSE #0681 PLANO TX',
          category: 'COSTCO WHSE #0681 PLANO TX',
          duplicate: true,
        },
      ],
      actualTransactions: [
        {
          date: '2025-02-02',
          amount: 126.44,
          category: 'COSTCO WHSE #0681 PLANO TX',
          note: 'COSTCO WHSE #0681 PLANO TX',
        },
      ],
    });

    expect(result.counters.matched).toBe(1);
    expect(result.counters.duplicateCorrect).toBe(1);
    expect(result.counters.dateCorrect).toBe(1);
    expect(result.counters.amountCorrect).toBe(1);
    expect(result.counters.merchantCorrect).toBe(1);
    expect(result.counters.categoryCorrect).toBe(1);
  });

  test('creates a pass/fail report for supplied cases', async () => {
    const report = await createEvaluationReport({
      cases: [
        {
          id: 'inline-case',
          inputText: 'Statement Period Jan 01 2025 - Jan 31 2025\n01/03 WHOLE FOODS MARKET 10245 AUSTIN TX $84.23',
          expectedTransactions: [
            {
              date: '2025-01-03',
              amount: 84.23,
              merchant: 'WHOLE FOODS MARKET 10245 AUSTIN TX',
              category: 'WHOLE FOODS MARKET 10245 AUSTIN TX',
            },
          ],
        },
      ],
      previousReport: {
        summary: {
          overallAccuracy: 1,
          dateAccuracy: 1,
          amountAccuracy: 1,
          merchantAccuracy: 1,
          categoryAccuracy: 1,
          duplicateDetectionAccuracy: 1,
          parseFailureRate: 0,
          averageLatencyMs: 999999,
          estimatedCostUsd: 0,
        },
      },
    });

    expect(report.status).toBe('pass');
    expect(report.summary.overallAccuracy).toBe(1);
    expect(report.testCases).toHaveLength(1);
    expect(report.testCases[0].status).toBe('pass');
  });
});
