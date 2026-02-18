import type { Book } from '../models/book.model';
import { BookStatus } from '../models/book-status.model';

export const CSV_HEADERS = [
  'Title',
  'Author',
  'Status',
  'Published Date',
  'Reading Start Date',
  'Reading End Date',
  'Notes',
  'Tags',
] as const;

export interface ParsedBookRow {
  title: string;
  author: string;
  status: BookStatus;
  readingStartDate?: string;
  readingEndDate?: string;
  publishedDate?: string;
  notes?: string;
  tags?: string[];
}

/** Build a single CSV row from a book. */
export function bookToCsvRow(book: Book): string {
  const row = [
    escapeCsv(book.title),
    escapeCsv(book.author),
    escapeCsv(book.status),
    dateToCsv(book.publishedDate),
    dateToCsv(book.readingStartDate),
    dateToCsv(book.readingEndDate),
    escapeCsv(book.notes ?? ''),
    escapeCsv(book.tags?.join(';') ?? ''),
  ];
  return row.join(',');
}

/** Build full CSV content (header + rows). */
export function booksToCsv(books: Book[], includeData: boolean): string {
  let out = CSV_HEADERS.join(',') + '\n';
  if (includeData) {
    for (const book of books) {
      out += bookToCsvRow(book) + '\n';
    }
  }
  return out;
}

function escapeCsv(s: string): string {
  if (!s) return '';
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function dateToCsv(d: string | undefined): string {
  if (!d) return '';
  const slice = d.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : d;
}

/** Parse a CSV line respecting quoted fields. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const next = line[i + 1];
    if (c === '"') {
      if (inQ && next === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** Parse header line into map of column name -> standard header key. Returns null if Title/Author missing. */
export function parseCsvHeader(line: string): Record<string, string> | null {
  const headers = parseCsvLine(line).map((h) => h.trim());
  const map: Record<string, string> = {};
  for (const h of headers) {
    const m = CSV_HEADERS.find((c) => c.toLowerCase() === h.toLowerCase());
    if (m) map[h] = m;
  }
  if (!map['Title'] || !map['Author']) return null;
  return map;
}

/** Parse one data row into a book-like object. Throws if Title/Author missing. */
export function parseCsvRow(
  line: string,
  headerMap: Record<string, string>,
  _rowNum: number
): ParsedBookRow | null {
  const values = parseCsvLine(line);
  const headers = Object.keys(headerMap);
  while (values.length < headers.length) values.push('');
  const row: Record<string, string> = {};
  headers.forEach((h, i) => {
    row[headerMap[h] ?? h] = (values[i] ?? '').trim();
  });
  const title = row['Title']?.trim();
  const author = row['Author']?.trim();
  if (!title || !author) throw new Error('Title and Author are required');
  const status = normalizeStatus(row['Status']) ?? BookStatus.ToRead;
  const tags = parseTags(row['Tags']);
  return {
    title,
    author,
    status,
    publishedDate: parseDate(row['Published Date']),
    readingStartDate: parseDate(row['Reading Start Date']),
    readingEndDate: parseDate(row['Reading End Date']),
    notes: row['Notes'] || undefined,
    tags: tags.length ? tags : undefined,
  };
}

function parseTags(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split(';')
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseDate(s: string | undefined): string | undefined {
  if (!s?.trim()) return undefined;
  const d = new Date(s.trim());
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function normalizeStatus(s: string | undefined): BookStatus | null {
  if (!s?.trim()) return null;
  const lower = s.toLowerCase().trim();
  const map: Record<string, BookStatus> = {
    'to read': BookStatus.ToRead,
    reading: BookStatus.Reading,
    finished: BookStatus.Finished,
    'on hold': BookStatus.OnHold,
    abandoned: BookStatus.Abandoned,
    read: BookStatus.Finished,
    completed: BookStatus.Finished,
    dropped: BookStatus.Abandoned,
    dnf: BookStatus.Abandoned,
  };
  return (
    map[lower] ??
    (Object.values(BookStatus).includes(lower as BookStatus)
      ? (lower as BookStatus)
      : null)
  );
}
