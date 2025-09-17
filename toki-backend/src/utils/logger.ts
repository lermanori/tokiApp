// Simple backend logger with levels: error > warn > info > debug
// Level is controlled by process.env.LOG_LEVEL (set by user) with default 'warn'.

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
    const asNum = Number(input);
    if (!Number.isNaN(asNum)) {
      const clamped = Math.min(Math.max(asNum, 0), 4);
      return (Object.keys(LEVELS) as LogLevelName[])[clamped] ?? fallback;
    }
  }
  return fallback;
}

const envLevel = process.env.LOG_LEVEL;
let currentLevel: LogLevelName = parseLevel(envLevel, 'warn');

const should = (required: LogLevelName) => LEVELS[currentLevel] >= LEVELS[required];

export const logger = {
  setLevel(level: LogLevelName) {
    currentLevel = parseLevel(level, currentLevel);
    // Use native console to avoid recursion
    // eslint-disable-next-line no-console
    console.info('🔧 [LOGGER] Level set to:', currentLevel);
  },
  getLevel(): LogLevelName {
    return currentLevel;
  },
  error: (...args: any[]) => {
    if (should('error')) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (should('warn')) console.warn(...args);
  },
  info: (...args: any[]) => {
    if (should('info')) console.info(...args);
  },
  debug: (...args: any[]) => {
    if (should('debug')) console.debug(...args);
  },
};

export default logger;


