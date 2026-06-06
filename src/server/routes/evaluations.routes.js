const express = require('express');

const logger = require('../logger');
const { createEvaluationRepository } = require('../services/evaluation/evaluationRepository.service');
const {
  DEFAULT_THRESHOLDS,
  createEvaluationReport,
} = require('../services/evaluation/statementImportEvaluation.service');

const createEvaluationsRouter = ({ adminRequired, allAsync, getAsync, runAsync }) => {
  const router = express.Router();
  const evaluationRuns = createEvaluationRepository({ allAsync, getAsync, runAsync });

  router.use(adminRequired);

  router.get('/evaluations', async (req, res) => {
    try {
      const runs = await evaluationRuns.listRuns({
        feature: req.query.feature ? String(req.query.feature) : null,
        limit: req.query.limit,
      });
      res.json({ runs });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load AI evaluation runs');
      res.status(500).json({ error: 'Failed to load AI evaluation runs' });
    }
  });

  router.get('/evaluations/:id', async (req, res) => {
    try {
      const run = await evaluationRuns.getRun(req.params.id);
      if (!run) {
        return res.status(404).json({ error: 'Evaluation run not found' });
      }
      res.json({ run });
    } catch (error) {
      logger.error({ err: error }, 'Failed to load AI evaluation run');
      res.status(500).json({ error: 'Failed to load AI evaluation run' });
    }
  });

  router.post('/evaluations/statement-import/run', async (req, res) => {
    try {
      const previousRun = await evaluationRuns.getLatestRun('statement-import');
      const thresholds = {
        ...DEFAULT_THRESHOLDS,
        ...(req.body?.thresholds || {}),
      };
      const report = await createEvaluationReport({
        previousReport: previousRun?.report || null,
        thresholds,
      });
      const run = await evaluationRuns.saveRun(report);
      res.status(report.status === 'pass' ? 200 : 422).json({ run, report });
    } catch (error) {
      logger.error({ err: error }, 'Failed to run statement import evaluation');
      res.status(500).json({ error: 'Failed to run statement import evaluation' });
    }
  });

  return router;
};

module.exports = createEvaluationsRouter;
