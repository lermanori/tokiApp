/**
 * TIMEZONE CONTRACT:
 * - All scheduled_time values are stored and returned as UTC
 * - Format: "YYYY-MM-DD HH:MM" (without timezone suffix for frontend compatibility)
 * - The time_slot column is DEPRECATED - kept for backward compatibility only
 * - scheduledTime is the single source of truth for event timing
 */

import { Router } from 'express';

import createRouter from './tokis/create';
import listRouter from './tokis/list';
import myRouter from './tokis/my';
import readRouter from './tokis/read';
import updateRouter from './tokis/update';
import metadataRouter from './tokis/metadata';
import hideRouter from './tokis/hide';
import invitesRouter from './tokis/invites';
import joinRouter from './tokis/join';
import lifecycleRouter from './tokis/lifecycle';
import inviteLinksRouter from './tokis/invite-links';

const router = Router();

// Static & metadata routes first to avoid being shadowed by /:id matchers
router.use(metadataRouter);
router.use(hideRouter);
router.use(myRouter);
router.use(invitesRouter);
router.use(inviteLinksRouter);
router.use(joinRouter);
router.use(lifecycleRouter);
router.use(listRouter);
router.use(readRouter);
router.use(updateRouter);
router.use(createRouter);

export default router;
