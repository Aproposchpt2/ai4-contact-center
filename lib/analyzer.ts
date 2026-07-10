export interface ScriptOption {
  key?: number | string;
  label?: string;
  queue?: string;
  route?: string;
  target?: string;
  next_menu?: string;
}

export interface ScriptModel {
  menu?: string;
  options?: ScriptOption[];
  after_hours?: string | null;
  holiday?: string | null;
}

export interface AnalysisReport {
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export function checkMissingMenu(script: ScriptModel): string[] {
  if (!script.menu) return ['Missing main menu definition.'];
  return [];
}

export function checkMenuOptions(script: ScriptModel): string[] {
  const errors: string[] = [];
  const options = script.options;

  if (!Array.isArray(options) || options.length === 0) {
    errors.push('Menu has no options.');
    return errors;
  }

  for (const option of options) {
    if (option.key === undefined || option.key === null || !option.label) {
      errors.push('Menu option missing key or label.');
    }
  }

  return errors;
}

export function checkQueueReferences(script: ScriptModel): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const options = Array.isArray(script.options) ? script.options : [];

  for (const option of options) {
    const optionId = option.key ?? '?';
    if (!option.queue) {
      errors.push(`Menu option ${optionId} missing queue reference.`);
      continue;
    }
    if (/\s/.test(option.queue)) {
      warnings.push('Queue name should not contain spaces.');
    }
  }

  return { errors, warnings };
}

export function checkAfterHours(script: ScriptModel): string[] {
  if (!script.after_hours) return ['After-hours logic not defined.'];
  return [];
}

export function checkHoliday(script: ScriptModel): string[] {
  if (!script.holiday) return ['Holiday logic not defined.'];
  return [];
}

export function checkNamingConsistency(script: ScriptModel): string[] {
  const options = Array.isArray(script.options) ? script.options : [];
  const hasLowercaseLabel = options.some((opt) => /[a-z]/.test(opt.label ?? ''));
  if (hasLowercaseLabel) return ['Consider using Title Case for menu labels.'];
  return [];
}

export function checkInfiniteLoops(script: ScriptModel): string[] {
  const warnings: string[] = [];
  const menu = (script.menu ?? '').trim().toLowerCase();
  const options = Array.isArray(script.options) ? script.options : [];

  for (const option of options) {
    const route = `${option.route ?? option.target ?? option.next_menu ?? ''}`
      .trim()
      .toLowerCase();
    if (menu && route && route === menu) {
      warnings.push('Potential infinite loop detected in menu routing.');
      break;
    }
  }

  return warnings;
}

export function buildReport(script: ScriptModel): AnalysisReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  errors.push(...checkMissingMenu(script));
  errors.push(...checkMenuOptions(script));

  const queueCheck = checkQueueReferences(script);
  errors.push(...queueCheck.errors);
  warnings.push(...queueCheck.warnings);

  warnings.push(...checkAfterHours(script));
  warnings.push(...checkHoliday(script));
  warnings.push(...checkInfiniteLoops(script));
  recommendations.push(...checkNamingConsistency(script));

  return { errors, warnings, recommendations };
}

