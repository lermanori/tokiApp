import { Router } from 'express';

import reportsRouter from './admin/reports';
import mcpKeysRouter from './admin/mcp-keys';
import authRouter from './admin/auth';
import waitlistRouter from './admin/waitlist';
import usersRouter from './admin/users';
import tokisRouter from './admin/tokis';
import algorithmRouter from './admin/algorithm';
import emailTemplatesRouter from './admin/email-templates';
import analyticsRouter from './admin/analytics';
import notificationScheduleRouter from './admin/notification-schedule';
import batchUploadRouter from './admin/batch-upload';
import tokenDebugRouter from './admin/token-debug';
import boostPurchaseRequestsRouter from './admin/boost-purchase-requests';
import featureFlagsRouter from './admin/feature-flags';

const router = Router();

router.use(reportsRouter);
router.use(mcpKeysRouter);
router.use(authRouter);
router.use(waitlistRouter);
router.use(usersRouter);
router.use(tokisRouter);
router.use(algorithmRouter);
router.use(emailTemplatesRouter);
router.use(analyticsRouter);
router.use(notificationScheduleRouter);
router.use(batchUploadRouter);
router.use(tokenDebugRouter);
router.use(boostPurchaseRequestsRouter);
router.use(featureFlagsRouter);

export default router;
