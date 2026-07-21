import { logger } from './logger';

/**
 * Renders a template string by replacing every `{{variable_name}}` token with
 * the corresponding value from the `variables` map.
 *
 * Missing variables are replaced with an empty string and a warning is logged.
 * The function never throws — callers can rely on always getting a string back.
 *
 * @param text  - Template text containing `{{variable_name}}` tokens.
 * @param variables - Map of variable names to their replacement values.
 * @returns The rendered text with all known tokens substituted.
 */
export function renderTemplate(
  text: string,
  variables: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, variableKey: string) => {
    const value = variables[variableKey];
    if (value === undefined) {
      logger.warn(
        'TEMPLATE_RENDERER',
        `Missing variable "{{${variableKey}}}" — substituting empty string. Available keys: ${Object.keys(variables).join(', ')}`,
      );
      return '';
    }
    return value;
  });
}
