type OpenExternalUrlOptions = {
  requireHttp?: boolean;
};

export function openExternalUrl(
  url: string | undefined | null,
  options?: OpenExternalUrlOptions,
): void {
  const requireHttp = options?.requireHttp ?? true;

  if (!url || (requireHttp && !url.startsWith('http'))) {
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}