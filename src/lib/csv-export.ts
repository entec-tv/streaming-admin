type CsvCell = string | number | boolean | null | undefined;

function escapeCsvCell(value: CsvCell): string {
  const text = String(value ?? "").replace(/\r\n?/g, "\n");
  const safeText = /^[\u0000-\u0020]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]) {
  const content = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function datedCsvFilename(name: string) {
  return `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
}
