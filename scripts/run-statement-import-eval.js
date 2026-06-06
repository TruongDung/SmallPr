#!/usr/bin/env node

const {
  DEFAULT_REPORTS_DIR,
  createEvaluationReport,
  loadLatestReport,
  writeEvaluationReport,
} = require('../src/server/services/evaluation/statementImportEvaluation.service');

const main = async () => {
  const previousReport = process.env.EVAL_COMPARE_PREVIOUS === 'false'
    ? null
    : loadLatestReport(DEFAULT_REPORTS_DIR);
  const report = await createEvaluationReport({ previousReport });
  const reportPath = writeEvaluationReport(report, DEFAULT_REPORTS_DIR);

  console.log(`Statement import evaluation: ${report.status.toUpperCase()}`);
  console.log(`Report: ${reportPath}`);
  console.log(JSON.stringify({
    summary: report.summary,
    thresholdFailures: report.thresholdFailures,
    blockingRegressions: report.blockingRegressions,
    regressions: report.regressions,
    testCases: report.testCases.map((testCase) => ({
      id: testCase.id,
      status: testCase.status,
      parseError: testCase.parseError,
      summary: testCase.summary,
      thresholdFailures: testCase.thresholdFailures,
    })),
  }, null, 2));

  if (report.status !== 'pass') {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
