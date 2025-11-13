// Frontend console logger gate with levels: error > warn > info > debug
// Level is controlled by EXPO_PUBLIC_LOG_LEVEL or globalThis.__LOG_LEVEL

type LogLevelName = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LEVELS: Record<LogLevelName, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

function parseLevel(input: unknown, fallback: LogLevelName): LogLevelName {
  if (typeof input === 'string') {
    const key = input.toLowerCase().trim() as LogLevelName;
    if (key in LEVELS) return key;
  }
  return fallback;
}

declare global {
  // eslint-disable-next-line no-var
  var __FE_LOGGER_INITIALIZED__: boolean | undefined;
  // eslint-disable-next-line no-var
  var __LOG_LEVEL__: LogLevelName | undefined;
}

(() => {
  if (globalThis.__FE_LOGGER_INITIALIZED__) return;

  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug ?? console.log,
  };

  const envLevel = (process?.env as any)?.EXPO_PUBLIC_LOG_LEVEL || globalThis.__LOG_LEVEL__;
  let currentLevel: LogLevelName = parseLevel(envLevel, 'warn');

  const should = (required: LogLevelName) => LEVELS[currentLevel] >= LEVELS[required];

  console.error = (...args: any[]) => {
    if (should('error')) original.error(...args);
  };
  console.warn = (...args: any[]) => {
    if (should('warn')) original.warn(...args);
  };
  console.info = (...args: any[]) => {
    if (should('info')) original.info(...args);
  };
  console.debug = (...args: any[]) => {
    if (should('debug')) original.debug(...args);
  };
  console.log = (...args: any[]) => {
    if (should('info')) original.log(...args);
  };

  // Tiny helpers to tweak at runtime from DevTools
  (globalThis as any).setLogLevel = (lvl: LogLevelName) => {
    currentLevel = parseLevel(lvl, currentLevel);
    original.info('🔧 [FE LOGGER] Level set to:', currentLevel);
  };
  (globalThis as any).getLogLevel = () => currentLevel;

  globalThis.__FE_LOGGER_INITIALIZED__ = true;
})();

export {};


