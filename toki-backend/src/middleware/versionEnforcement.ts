import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

import {
  createUnsupportedVersionErrorPayload,
  evaluateVersionPolicy,
  type ClientVersionMetadata,
} from '../services/versionPolicyService';

const EXEMPT_PATH_PREFIXES = [
  '/mobile/bootstrap',
  '/health',
  '/mcp',
];

const LEGACY_BLOCKED_IOS_USER_AGENTS = [
  /^Toki\/1\b/i,
];

const parseBuildHeader = (headerValue: string | string[] | undefined): number | null => {
  const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!rawValue) {
    return null;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const readClientVersionMetadata = (request: Request): ClientVersionMetadata => {
  const platformHeader = request.headers['x-platform'];
  const appVersionHeader = request.headers['x-app-version'];
  const runtimeVersionHeader = request.headers['x-runtime-version'];
  const updateIdHeader = request.headers['x-update-id'];
  const updateChannelHeader = request.headers['x-update-channel'];

  return {
    platform: (Array.isArray(platformHeader) ? platformHeader[0] : platformHeader || 'web') as ClientVersionMetadata['platform'],
    appVersion: (Array.isArray(appVersionHeader) ? appVersionHeader[0] : appVersionHeader) || null,
    appBuild: parseBuildHeader(request.headers['x-app-build']),
    runtimeVersion: (Array.isArray(runtimeVersionHeader) ? runtimeVersionHeader[0] : runtimeVersionHeader) || null,
    updateId: (Array.isArray(updateIdHeader) ? updateIdHeader[0] : updateIdHeader) || null,
    updateChannel: (Array.isArray(updateChannelHeader) ? updateChannelHeader[0] : updateChannelHeader) || null,
  };
};

const isLegacyBlockedIosClient = (request: Request, client: ClientVersionMetadata): boolean => {
  const platformHeader = request.headers['x-platform'];
  const appVersionHeader = request.headers['x-app-version'];

  if (platformHeader || appVersionHeader || client.appBuild !== null || client.runtimeVersion) {
    return false;
  }

  const userAgentHeader = request.headers['user-agent'];
  const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader || '';

  return LEGACY_BLOCKED_IOS_USER_AGENTS.some((pattern) => pattern.test(userAgent));
};

export const versionEnforcementMiddleware = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  if (EXEMPT_PATH_PREFIXES.some((pathPrefix) => request.path.startsWith(pathPrefix))) {
    next();
    return;
  }

  const client = readClientVersionMetadata(request);
  const userAgentHeader = request.headers['user-agent'];
  const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader || null;
  const missingVersionHeaders = !client.appVersion || !request.headers['x-platform'];

  if (missingVersionHeaders) {
    logger.info('[VERSION] Request missing mobile version headers', {
      method: request.method,
      path: request.path,
      platform: client.platform,
      appVersion: client.appVersion,
      appBuild: client.appBuild,
      runtimeVersion: client.runtimeVersion,
      updateId: client.updateId,
      updateChannel: client.updateChannel,
      userAgent,
      authorizationPresent: Boolean(request.headers.authorization),
      accept: request.headers.accept || null,
    });
  }

  if (client.platform !== 'ios' && client.platform !== 'android') {
    if (isLegacyBlockedIosClient(request, client)) {
      const legacyPolicy = evaluateVersionPolicy({
        platform: 'ios',
        appVersion: '0.0.0',
        appBuild: 1,
        runtimeVersion: null,
        updateId: null,
        updateChannel: null,
      });

      logger.warn('[VERSION] Blocking legacy iOS client identified by default user-agent', {
        method: request.method,
        path: request.path,
        userAgent,
      });

      response.status(426).json(createUnsupportedVersionErrorPayload(legacyPolicy));
      return;
    }

    next();
    return;
  }

  const policy = evaluateVersionPolicy(client);
  const isBlocked = policy.maintenance.active
    || policy.support.state === 'requires_ota'
    || policy.support.state === 'requires_store'
    || policy.support.state === 'maintenance';

  if (!isBlocked) {
    next();
    return;
  }

  const statusCode = policy.support.state === 'maintenance' ? 503 : 426;
  response.status(statusCode).json(createUnsupportedVersionErrorPayload(policy));
};
