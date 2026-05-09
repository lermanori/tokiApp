import { Router, Request, Response } from 'express';

import { evaluateVersionPolicy, type ClientVersionMetadata } from '../services/versionPolicyService';

const router = Router();

const parseBuildHeader = (headerValue: string | string[] | undefined): number | null => {
  const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!rawValue) {
    return null;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const readClientVersionMetadata = (request: Request): ClientVersionMetadata => {
  return {
    platform: ((Array.isArray(request.headers['x-platform']) ? request.headers['x-platform'][0] : request.headers['x-platform']) || 'web') as ClientVersionMetadata['platform'],
    appVersion: (Array.isArray(request.headers['x-app-version']) ? request.headers['x-app-version'][0] : request.headers['x-app-version']) || null,
    appBuild: parseBuildHeader(request.headers['x-app-build']),
    runtimeVersion: (Array.isArray(request.headers['x-runtime-version']) ? request.headers['x-runtime-version'][0] : request.headers['x-runtime-version']) || null,
    updateId: (Array.isArray(request.headers['x-update-id']) ? request.headers['x-update-id'][0] : request.headers['x-update-id']) || null,
    updateChannel: (Array.isArray(request.headers['x-update-channel']) ? request.headers['x-update-channel'][0] : request.headers['x-update-channel']) || null,
  };
};

router.get('/bootstrap', (request: Request, response: Response) => {
  const client = readClientVersionMetadata(request);
  const policy = evaluateVersionPolicy(client);

  response.status(200).json(policy);
});

export default router;
