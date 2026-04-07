import { getSafeLimit } from '@/src/utils/pagination';

export const EXPORT_MAX_ROWS = 500;
const EXPORT_CHUNK_SIZE = 100;

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

export interface PaginatedChunk<T> {
  data: T[];
  totalPages: number;
  page: number;
}

function toCellString(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function escapeCsvCell(input: string): string {
  const escaped = input.replace(/"/g, '""');
  if (/[",\n\r]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
}

function buildCsv<T>(rows: T[], columns: ExportColumn<T>[]): string {
  const headerLine = columns.map((column) => escapeCsvCell(column.header)).join(',');
  const bodyLines = rows.map((row) =>
    columns
      .map((column) => escapeCsvCell(toCellString(column.value(row))))
      .join(','),
  );

  return [headerLine, ...bodyLines].join('\n');
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function collectPaginatedExportRows<T>(input: {
  fetchPage: (page: number, limit: number) => Promise<PaginatedChunk<T>>;
  maxRows?: number;
  chunkSize?: number;
  shouldInclude?: (row: T) => boolean;
}): Promise<T[]> {
  const maxRowsCandidate = typeof input.maxRows === 'number' ? Math.trunc(input.maxRows) : EXPORT_MAX_ROWS;
  const maxRows = Math.min(Math.max(maxRowsCandidate, 1), EXPORT_MAX_ROWS);
  const chunkSize = getSafeLimit(input.chunkSize, EXPORT_CHUNK_SIZE);

  const rows: T[] = [];
  let page = 1;
  let totalPages = 1;

  while (rows.length < maxRows && page <= totalPages) {
    const chunk = await input.fetchPage(page, chunkSize);
    totalPages = Math.max(chunk.totalPages || 1, 1);

    if (!chunk.data || chunk.data.length === 0) {
      break;
    }

    for (const row of chunk.data) {
      if (input.shouldInclude && !input.shouldInclude(row)) {
        continue;
      }

      rows.push(row);

      if (rows.length >= maxRows) {
        break;
      }
    }

    if (chunk.data.length < chunkSize) {
      break;
    }

    page += 1;

    // Yield to the browser event loop between chunks to keep UI responsive.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  return rows;
}

export async function downloadCsvExport<T>(input: {
  filename: string;
  rows: T[];
  columns: ExportColumn<T>[];
}): Promise<void> {
  const csv = buildCsv(input.rows, input.columns);
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), input.filename);
}

export async function downloadPdfExport<T>(input: {
  filename: string;
  title: string;
  rows: T[];
  columns: ExportColumn<T>[];
}): Promise<void> {
  try {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const autoTable = autoTableModule.default;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    const headers = [input.columns.map((column) => column.header)];
    const body = input.rows.map((row) =>
      input.columns.map((column) => toCellString(column.value(row))),
    );

    doc.setFontSize(12);
    doc.text(input.title, 40, 30);

    autoTable(doc, {
      head: headers,
      body,
      startY: 40,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [31, 41, 55],
      },
      margin: {
        left: 20,
        right: 20,
      },
    });

    doc.save(input.filename);
  } catch (error) {
    throw error;
  }
}

export async function exportToPDF<T>(input: {
  data: T[];
  filename: string;
  title: string;
  columns: ExportColumn<T>[];
}): Promise<void> {
  await downloadPdfExport({
    filename: input.filename,
    title: input.title,
    rows: input.data,
    columns: input.columns,
  });
}
