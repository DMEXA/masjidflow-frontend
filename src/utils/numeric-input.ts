const INTEGER_PATTERN = /^(0|[1-9]\d*)$/;
const DECIMAL_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;

export function isStrictIntegerString(value: string): boolean {
  return INTEGER_PATTERN.test(value.trim());
}

export function isStrictAmountString(value: string): boolean {
  return DECIMAL_PATTERN.test(value.trim());
}

export function parseStrictIntegerInput(value: string): number | null {
  const trimmed = value.trim();
  if (!isStrictIntegerString(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseStrictAmountInput(value: string): number | null {
  const trimmed = value.trim();
  if (!isStrictAmountString(trimmed)) return null;

  const [wholePart, fractionPart = ''] = trimmed.split('.');
  const minor = Number(wholePart) * 100 + Number((fractionPart + '00').slice(0, 2));
  if (!Number.isSafeInteger(minor)) return null;
  return Number((minor / 100).toFixed(2));
}
