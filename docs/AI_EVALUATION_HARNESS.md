# AI Evaluation Harness

## 1. Recommended Folder Structure

```text
src/server/services/evaluation/
  evaluationRepository.service.js
  statementImportEvaluation.service.js
src/server/routes/
  evaluations.routes.js
evaluations/
  statement-import/
    README.md
    cases/
      amex-basic.json
      chase-duplicates.json
    reports/
scripts/
  run-statement-import-eval.js
```

The evaluator is feature-oriented: shared scoring/report primitives live in `services/evaluation`, while each AI feature can add its own case loader, parser adapter, and thresholds.

## 2. Database Schema Changes

Migration `020_create_ai_evaluation_runs.sql` adds `ai_evaluation_runs`:

- `feature`: evaluated feature, for example `statement-import`
- `status`: `pass` or `fail`
- `summary`: metrics JSONB for fast list views
- `report`: full JSONB report with per-case comparisons
- `started_at`, `completed_at`, `created_at`

This keeps CI reports available in the product and makes regression comparisons possible from Postgres.

## 3. API Endpoints

Admin-only endpoints:

- `GET /api/admin/evaluations?feature=statement-import&limit=20`
- `GET /api/admin/evaluations/:id`
- `POST /api/admin/evaluations/statement-import/run`

The run endpoint executes local cases, compares against the previous saved run, persists the report, and returns `200` on pass or `422` on evaluation failure.

## 4. Service Architecture

Current pipeline:

1. `POST /api/transactions/import-statement`
2. `unpdf` extracts text from base64 PDF
3. Regex parser extracts candidate purchase lines
4. Normalization maps description to `category` and `note`
5. Client previews rows; persistence happens through normal transaction creation

Harness pipeline:

1. Load case JSON from `evaluations/statement-import/cases`
2. Feed either `inputText`, `inputTextPath`, `pdfBase64`, or `pdfPath` into a parser adapter
3. Compare actual rows against expected rows
4. Score date, amount, merchant, category, duplicate handling, parse failures, latency, and estimated cost
5. Compare against previous report
6. Write JSON report and optionally persist to Postgres

## 5. Example Evaluation Datasets

The included cases cover:

- `amex-basic.json`: date formats, purchase extraction, skipped payment/summary lines
- `chase-duplicates.json`: exact duplicate suppression, ISO dates, skipped interest lines

Expected transaction shape:

```json
{
  "date": "2025-01-03",
  "amount": 84.23,
  "merchant": "WHOLE FOODS MARKET",
  "category": "Groceries",
  "duplicate": false
}
```

## 6. Example Implementation Code

Run locally:

```bash
npm run eval:statement-import
```

Programmatic usage:

```js
const {
  createEvaluationReport,
  loadLatestReport,
  writeEvaluationReport,
} = require('./src/server/services/evaluation/statementImportEvaluation.service');

const previousReport = loadLatestReport();
const report = await createEvaluationReport({ previousReport });
writeEvaluationReport(report);
```

## 7. CI/CD Integration Strategy

Recommended CI stages:

1. `npm test`
2. `npm run eval:statement-import`
3. Upload `evaluations/statement-import/reports/latest.json` as a build artifact
4. Fail the build on threshold failures or regressions

For production-grade CI, keep two suites:

- PR gate: small deterministic text fixtures, no network AI calls
- Nightly eval: real PDFs, live model calls, broad issuer coverage, persisted reports

## 8. Redis Caching Opportunities

- Cache PDF text extraction by SHA-256 of PDF bytes: `eval:statement-import:pdf-text:{hash}`
- Cache parser output by `{feature}:{model}:{promptVersion}:{inputHash}`
- Cache latest report summary for dashboard/admin views
- Cache expensive semantic merchant matching if embedding-based matching is added later

Keep evaluation cache keys versioned by parser/model/prompt so stale outputs do not hide regressions.

## 9. Observability And Logging

Log structured fields:

- `evaluationRunId`
- `feature`
- `caseId`
- `parserVersion`
- `model`
- `promptVersion`
- `latencyMs`
- `estimatedCostUsd`
- `parseError`
- `thresholdFailures`
- `regressions`

Add metrics:

- eval pass rate by feature
- parse failure rate
- field accuracy gauges
- p50/p95 latency
- estimated cost per run
- case count and issuer coverage

## 10. Production-Ready Portfolio Upgrades

- Add model/prompt registry tables and pin every run to a parser version
- Store redacted PDF fixtures in private object storage with hash-based integrity checks
- Add reviewer workflow for approving expected-output changes
- Add issuer taxonomy and coverage dashboards
- Add OpenTelemetry spans around PDF extraction, AI calls, normalization, and matching
- Add deterministic mock model fixtures for PRs and live model evals for scheduled builds
- Add per-field severity thresholds so amount/date regressions block harder than category drift
- Add HTML report rendering with diff views for failed rows
- Add PII redaction and fixture generation tools before any real statement enters the repo
