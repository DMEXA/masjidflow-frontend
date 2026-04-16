export function normalizeIndianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  return null;
}

export function isValidIndianPhone(phone: string): boolean {
  return normalizeIndianPhone(phone) !== null;
}
