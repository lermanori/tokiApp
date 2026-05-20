import { Router, Request, Response } from 'express';
import { getFeatures } from '../services/featureFlags';

const router = Router();

// Public: clients fetch the current feature flag snapshot on boot.
router.get('/', async (_req: Request, res: Response) => {
  try {
    const flags = await getFeatures();
    res.json(flags);
  } catch {
    res.json({});
  }
});

export default router;
