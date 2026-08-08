export function isDirectUrlOrDomain(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (/^(https?|ftp|file|aura):\/\//i.test(trimmed)) {
    return true;
  }
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return true;
  }
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::\d+)?(?:\/.*)?$/;
  return domainRegex.test(trimmed);
}

export function parseUrlOrSearch(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'https://duckduckgo.com';
  
  if (/^(https?|ftp|file|aura):\/\//i.test(trimmed)) {
    return trimmed;
  }
  
  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::\d+)?(?:\/.*)?$/;
  if (domainRegex.test(trimmed)) {
    return `https://${trimmed}`;
  }
  
  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
}
