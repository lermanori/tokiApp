import { Router } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    // Get backend version from package.json
    const backendPackagePath = join(__dirname, '../../package.json');
    const backendPackage = JSON.parse(readFileSync(backendPackagePath, 'utf8'));

    // Get system information
    const healthInfo = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      versions: {
        backend: backendPackage.version,
        node: process.version,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      },
    };

    res.status(200).json(healthInfo);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
