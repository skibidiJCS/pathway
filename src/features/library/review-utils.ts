export function downloadFile(
  filename: string,
  content: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function compactTitle(title: string, maxLength = 68): string {
  return title.length <= maxLength
    ? title
    : `${title.slice(0, maxLength - 1)}…`;
}

export function checkedLabel(lastCheckedAt: string | null): string {
  if (!lastCheckedAt) return "Not checked yet";
  return `Last checked ${new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(lastCheckedAt))}`;
}
