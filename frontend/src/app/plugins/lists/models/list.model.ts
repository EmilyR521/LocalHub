export type ListType = 'bulleted' | 'checklist';

export interface ListItem {
  id: string;
  /** Main line for the item. */
  title: string;
  /** Optional extra text (e.g. notes). */
  details?: string;
  checked?: boolean;
}

export interface List {
  id: string;
  title: string;
  type: ListType;
  /** User-selected emoji icon for the list */
  icon?: string;
  items: ListItem[];
}
