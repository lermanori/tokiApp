export interface ProtectedIntent {
  route: string;
  params?: Record<string, string>;
}

export const RESUME_ACTION_PARAM = 'resumeAction';

export const normalizeAnonymousRoute = (path?: string | null): string => {
  if (!path) return '/';

  let normalized = path.trim();
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/^\/\(tabs\)/, '');

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, '');
  }

  return normalized || '/';
};

export const isAnonymousLandingEligibleRoute = (path?: string | null): boolean => {
  const normalized = normalizeAnonymousRoute(path);
  return (
    normalized === '/toki-details' ||
    normalized === '/exMap' ||
    normalized.startsWith('/join/')
  );
};

export const isLandingRouteMatch = (
  landingRoute?: string | null,
  currentRoute?: string | null,
  landingParams?: Record<string, string> | null,
  currentParams?: Record<string, string> | null
): boolean => {
  const normalizedLanding = normalizeAnonymousRoute(landingRoute);
  const normalizedCurrent = normalizeAnonymousRoute(currentRoute);

  if (normalizedLanding !== normalizedCurrent) {
    return false;
  }

  if (normalizedLanding === '/toki-details') {
    const landingTokiId = landingParams?.tokiId;
    const currentTokiId = currentParams?.tokiId;
    if (landingTokiId && currentTokiId) {
      return landingTokiId === currentTokiId;
    }
  }

  return true;
};

export const buildIntentLoginUrl = (intent: ProtectedIntent): string => {
  const normalizedRoute = normalizeAnonymousRoute(intent.route);
  const params = new URLSearchParams(intent.params || {});

  if (normalizedRoute.startsWith('/join/')) {
    const pathParts = normalizedRoute.split('/').filter(Boolean);
    const code = pathParts[pathParts.length - 1];
    params.delete('code');
    const query = params.toString();
    return `/login?returnTo=join&code=${encodeURIComponent(code)}${query ? `&${query}` : ''}`;
  }

  const query = params.toString();
  return `/login?returnTo=${encodeURIComponent(normalizedRoute)}${query ? `&${query}` : ''}`;
};

export const stripResumeParams = (params: Record<string, any>) => {
  const cleaned = { ...params };
  delete cleaned.resumeAction;
  delete cleaned.resumeTokiId;
  delete cleaned.nextSavedState;
  delete cleaned.resumeTarget;
  delete cleaned.resumeSource;
  return cleaned;
};
