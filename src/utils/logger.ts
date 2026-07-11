/**
 * Centralized logger utility with color-coded terminal output and timestamps.
 * Uses ANSI escape codes — no external dependencies needed.
 */

const C = {
  reset:    '\x1b[0m',
  bold:     '\x1b[1m',
  dim:      '\x1b[2m',
  red:      '\x1b[31m',
  green:    '\x1b[32m',
  yellow:   '\x1b[33m',
  blue:     '\x1b[34m',
  magenta:  '\x1b[35m',
  cyan:     '\x1b[36m',
  white:    '\x1b[37m',
  gray:     '\x1b[90m',
  bgRed:    '\x1b[41m',
  bgGreen:  '\x1b[42m',
} as const;

function ts(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

function badge(level: string, color: string): string {
  return `${C.dim}[${ts()}]${C.reset} ${color}${C.bold}${level}${C.reset}`;
}

function details(obj?: Record<string, unknown>): string {
  if (!obj || Object.keys(obj).length === 0) return '';
  return (
    '\n' +
    Object.entries(obj)
      .map(([k, v]) => {
        const val =
          v === undefined ? 'undefined'
          : v === null    ? 'null'
          : typeof v === 'object' ? JSON.stringify(v)
          : String(v);
        return `    ${C.dim}${k}${C.reset}: ${C.white}${val}${C.reset}`;
      })
      .join('\n')
  );
}

function hr(char = '─', len = 64, color: string = C.gray): string {
  return `${color}${char.repeat(len)}${C.reset}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const logger = {

  /** General informational log */
  info(scope: string, message: string, data?: Record<string, unknown>): void {
    console.log(
      `${badge('INFO ', C.cyan)} ${C.cyan}[${scope}]${C.reset} ${message}${details(data)}`
    );
  },

  /** Success — operation completed without error */
  success(scope: string, message: string, data?: Record<string, unknown>): void {
    console.log(
      `${badge(' OK  ', C.green)} ${C.green}${C.bold}[${scope}]${C.reset} ${C.green}${message}${C.reset}${details(data)}`
    );
  },

  /** Warning — degraded but not failed */
  warn(scope: string, message: string, data?: Record<string, unknown>): void {
    console.warn(
      `${badge('WARN ', C.yellow)} ${C.yellow}${C.bold}[${scope}]${C.reset} ${C.yellow}${message}${C.reset}${details(data)}`
    );
  },

  /** Error — failure with optional Error object unpacking */
  error(scope: string, message: string, err?: unknown, data?: Record<string, unknown>): void {
    console.error(`\n${hr('═', 64, C.red)}`);
    console.error(
      `${badge('ERROR', C.red)} ${C.red}${C.bold}[${scope}]${C.reset} ${C.red}${C.bold}${message}${C.reset}${details(data)}`
    );
    if (err instanceof Error) {
      console.error(`    ${C.dim}message  :${C.reset} ${C.red}${err.message}${C.reset}`);
      if ((err as any).http_code !== undefined)
        console.error(`    ${C.dim}http_code:${C.reset} ${(err as any).http_code}`);
      if ((err as any).status !== undefined)
        console.error(`    ${C.dim}status   :${C.reset} ${(err as any).status}`);
      if ((err as any).code !== undefined)
        console.error(`    ${C.dim}code     :${C.reset} ${(err as any).code}`);
      if (process.env.NODE_ENV !== 'production' && err.stack) {
        const top = err.stack.split('\n').slice(1, 5).join('\n');
        console.error(`    ${C.dim}stack (top 4):${C.reset}\n${C.gray}${top}${C.reset}`);
      }
    } else if (err !== undefined) {
      console.error(`    ${C.dim}raw:${C.reset}`, err);
    }
    console.error(`${hr('═', 64, C.red)}\n`);
  },

  /** Large visual section marker — easy to spot in a scrolling terminal */
  section(title: string): void {
    console.log(`\n${hr('═', 64, C.blue)}`);
    console.log(`${C.blue}${C.bold}  ▶  ${title}${C.reset}`);
    console.log(`${hr('─', 64, C.blue)}`);
  },

  /** Indented sub-step within a section */
  step(scope: string, message: string, data?: Record<string, unknown>): void {
    console.log(
      `  ${C.dim}↳${C.reset} ${C.magenta}[${scope}]${C.reset} ${message}${details(data)}`
    );
  },
};
