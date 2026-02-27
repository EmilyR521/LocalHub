import { Component, computed, EventEmitter, inject, Output, signal } from '@angular/core';
import { ReaderService } from '../../services/reader.service';
import { BookStatus } from '../../models/book-status.model';
import type { Book } from '../../models/book.model';

/** Tags treated as category headers; other tags are grouped under Fiction or Non-Fiction. */
const FICTION_HEADER = 'fiction';
const NON_FICTION_HEADER = 'non-fiction';

export interface StatItem {
  name: string;
  count: number;
}

function isHeaderTag(tag: string): boolean {
  const t = tag.toLowerCase().trim();
  return t === FICTION_HEADER || t === NON_FICTION_HEADER;
}

function bookHasHeaderTag(book: { tags?: string[] }, header: string): boolean {
  return (book.tags ?? []).some((t) => (t ?? '').toLowerCase().trim() === header);
}

/** Angle in degrees: 0 = top, clockwise. Returns x,y for SVG (y down). */
function polarToCart(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** SVG path d for a donut segment (outer arc from startAngle to endAngle, then inner arc back). */
function donutSegmentPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const start = polarToCart(cx, cy, outerR, startAngleDeg);
  const end = polarToCart(cx, cy, outerR, endAngleDeg);
  const innerStart = polarToCart(cx, cy, innerR, startAngleDeg);
  const innerEnd = polarToCart(cx, cy, innerR, endAngleDeg);
  const largeOuter = endAngleDeg - startAngleDeg > 180 ? 1 : 0;
  const largeInner = endAngleDeg - startAngleDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${outerR} ${outerR} 0 ${largeOuter} 1 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A ${innerR} ${innerR} 0 ${largeInner} 0 ${innerStart.x} ${innerStart.y} Z`;
}

@Component({
  selector: 'app-reader-stats',
  standalone: true,
  templateUrl: './reader-stats.component.html',
})
export class ReaderStatsComponent {
  private reader = inject(ReaderService);

  /** Emitted when user clicks an author or genre to open the books table with that filter. */
  @Output() navigateToBooks = new EventEmitter<{ author?: string; tag?: string }>();

  /** Currently hovered donut segment for tooltip. */
  readonly hoveredSegment = signal<{ label: string; count: number } | null>(null);

  readonly finishedBooks = computed<Book[]>(() =>
    this.reader.books().filter((b) => b.status === BookStatus.Finished)
  );

  readonly topAuthors = computed<StatItem[]>(() => {
    const byAuthor = new Map<string, number>();
    for (const book of this.finishedBooks()) {
      const author = (book.author ?? '').trim() || 'Unknown';
      byAuthor.set(author, (byAuthor.get(author) ?? 0) + 1);
    }
    return [...byAuthor.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  });

  readonly topGenresFiction = computed<StatItem[]>(() => {
    const byTag = new Map<string, number>();
    for (const book of this.finishedBooks()) {
      if (!bookHasHeaderTag(book, FICTION_HEADER)) continue;
      for (const tag of book.tags ?? []) {
        const genre = (tag ?? '').trim();
        if (genre && !isHeaderTag(genre)) {
          byTag.set(genre, (byTag.get(genre) ?? 0) + 1);
        }
      }
    }
    return [...byTag.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  });

  readonly topGenresNonFiction = computed<StatItem[]>(() => {
    const byTag = new Map<string, number>();
    for (const book of this.finishedBooks()) {
      if (!bookHasHeaderTag(book, NON_FICTION_HEADER)) continue;
      for (const tag of book.tags ?? []) {
        const genre = (tag ?? '').trim();
        if (genre && !isHeaderTag(genre)) {
          byTag.set(genre, (byTag.get(genre) ?? 0) + 1);
        }
      }
    }
    return [...byTag.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  });

  /** Book counts for outer ring: Fiction (has Fiction tag), Non-Fiction (has Non-Fiction, not Fiction). */
  private readonly fictionBookCount = computed(() => {
    return this.finishedBooks().filter((b) => bookHasHeaderTag(b, FICTION_HEADER)).length;
  });
  private readonly nonFictionBookCount = computed(() => {
    return this.finishedBooks().filter(
      (b) => bookHasHeaderTag(b, NON_FICTION_HEADER) && !bookHasHeaderTag(b, FICTION_HEADER)
    ).length;
  });

  /** Donut chart: outer = Fiction / Non-Fiction; inner = genre segments within each arc. */
  readonly donutChartConfig = computed(() => {
    const fictionCount = this.fictionBookCount();
    const nonFictionCount = this.nonFictionBookCount();
    const totalOuter = fictionCount + nonFictionCount;
    const fictionGenres = this.topGenresFiction();
    const nonFictionGenres = this.topGenresNonFiction();
    const totalFictionGenre = fictionGenres.reduce((s, g) => s + g.count, 0);
    const totalNonFictionGenre = nonFictionGenres.reduce((s, g) => s + g.count, 0);

    const size = 220;
    const cx = size / 2;
    const cy = size / 2;
    const outerRingOuterR = 72;
    const outerRingInnerR = 52;
    const innerRingOuterR = 52;
    const innerRingInnerR = 32;

    const labelRadius = (outerRingOuterR + outerRingInnerR) / 2;

    const outerSegments: {
      label: string;
      count: number;
      pathD: string;
      color: string;
      labelX: number;
      labelY: number;
      labelRotation: number;
    }[] = [];
    const innerSegments: { name: string; count: number; category: 'fiction' | 'non-fiction'; pathD: string; color: string }[] = [];

    const fictionColor = '#4a90a4';
    const nonFictionColor = '#c75a38';

    if (totalOuter > 0) {
      let angle = 0;
      const fictionAngle = (360 * fictionCount) / totalOuter;
      const nonFictionAngle = (360 * nonFictionCount) / totalOuter;
      if (fictionCount > 0) {
        const midAngle = angle + fictionAngle / 2;
        const pos = polarToCart(cx, cy, labelRadius, midAngle);
        outerSegments.push({
          label: 'Fiction',
          count: fictionCount,
          pathD: donutSegmentPath(cx, cy, outerRingOuterR, outerRingInnerR, angle, angle + fictionAngle),
          color: fictionColor,
          labelX: pos.x,
          labelY: pos.y,
          labelRotation: midAngle,
        });
        angle += fictionAngle;
      }
      if (nonFictionCount > 0) {
        const midAngle = angle + nonFictionAngle / 2;
        const pos = polarToCart(cx, cy, labelRadius, midAngle);
        outerSegments.push({
          label: 'Non-Fiction',
          count: nonFictionCount,
          pathD: donutSegmentPath(cx, cy, outerRingOuterR, outerRingInnerR, angle, angle + nonFictionAngle),
          color: nonFictionColor,
          labelX: pos.x,
          labelY: pos.y,
          labelRotation: midAngle,
        });
      }
    }

    const innerGenrePalette = [
      '#1a5f7a', '#3d8fa3', '#5eb8c7', '#86d4de', '#b3e8ed',
      '#6b2d5c', '#9b4d7a', '#c27a9a', '#dda4bc', '#f0c9d9',
      '#2d5a3d', '#4d8b5c', '#6fb87a', '#9ad49e', '#c4ecc4',
      '#8b6914', '#b8922e', '#d4b85c', '#e5d088', '#f2e4b8',
      '#8b4513', '#a85c2e', '#c47a4a', '#dd9d6f', '#ecc49a',
    ];

    if (totalOuter > 0 && (totalFictionGenre > 0 || totalNonFictionGenre > 0)) {
      let angle = 0;
      const fictionAngle = (360 * fictionCount) / totalOuter;
      const nonFictionAngle = (360 * nonFictionCount) / totalOuter;

      if (fictionCount > 0 && fictionGenres.length > 0) {
        let a = angle;
        for (let i = 0; i < fictionGenres.length; i++) {
          const g = fictionGenres[i];
          const span = (g.count / totalFictionGenre) * fictionAngle;
          const end = a + span;
          innerSegments.push({
            name: g.name,
            count: g.count,
            category: 'fiction',
            pathD: donutSegmentPath(cx, cy, innerRingOuterR, innerRingInnerR, a, end),
            color: innerGenrePalette[innerSegments.length % innerGenrePalette.length],
          });
          a = end;
        }
        angle += fictionAngle;
      }
      if (nonFictionCount > 0 && nonFictionGenres.length > 0) {
        let a = angle;
        for (let i = 0; i < nonFictionGenres.length; i++) {
          const g = nonFictionGenres[i];
          const span = (g.count / totalNonFictionGenre) * nonFictionAngle;
          const end = a + span;
          innerSegments.push({
            name: g.name,
            count: g.count,
            category: 'non-fiction',
            pathD: donutSegmentPath(cx, cy, innerRingOuterR, innerRingInnerR, a, end),
            color: innerGenrePalette[innerSegments.length % innerGenrePalette.length],
          });
          a = end;
        }
      }
    }

    return {
      size,
      cx,
      cy,
      outerSegments,
      innerSegments,
      totalOuter,
      hasData: totalOuter > 0,
    };
  });
}
