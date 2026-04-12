function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /android/i.test(window.navigator.userAgent);
}

function toAndroidIntentUri(upiUri: string): string {
  const payload = upiUri.replace(/^upi:\/\//i, '');
  return `intent://${payload}#Intent;scheme=upi;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
}

export function launchUpiDeepLink(upiUri: string): void {
  if (typeof window === 'undefined' || !upiUri) return;

  if (isAndroidDevice()) {
    const intentUri = toAndroidIntentUri(upiUri);
    window.location.href = intentUri;

    // Fallback for browsers that ignore intent:// and only support upi://
    window.setTimeout(() => {
      window.location.href = upiUri;
    }, 350);
    return;
  }

  window.location.href = upiUri;
}
