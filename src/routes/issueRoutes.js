import { Router } from 'express';
import { issueController } from '../controllers/issueController.js';
import { validate } from '../middleware/validate.js';
import {
  createIssueSchema,
  issueQuerySchema,
  resolveIssueSchema,
} from '../schemas/issueSchemas.js';

const router = Router();

router.get('/', validate({ query: issueQuerySchema }), issueController.listIssues);
router.get('/:id', issueController.getIssue);
router.post('/', validate({ body: createIssueSchema }), issueController.createIssue);
router.post('/:id/resolve', validate({ body: resolveIssueSchema }), issueController.resolveIssue);

export default router;
