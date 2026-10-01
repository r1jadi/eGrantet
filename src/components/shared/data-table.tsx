import type { ReactNode } from "react";

export interface TableColumn<T> { key: string; header: string; cell: (row: T) => ReactNode; }
/**
 * Server-compatible data table.
 *
 * Deliberately NOT a client component: server pages pass `cell` render
 * functions, which cannot cross the server→client boundary. Keep this
 * free of hooks/handlers; interactive cell content should be its own
 * small client component.
 */
export function DataTable<T extends { id: string }>({ columns, rows, emptyMessage }: { columns: TableColumn<T>[]; rows: T[]; emptyMessage: string }) {
  return <div className="overflow-x-auto rounded-xl border bg-card shadow-[0_1px_2px_rgba(16,35,61,0.04)]"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/45 text-[11px] uppercase tracking-[0.08em] text-muted-foreground"><tr>{columns.map((column) => <th key={column.key} scope="col" className="px-5 py-3.5 font-semibold">{column.header}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">{emptyMessage}</td></tr> : rows.map((row) => <tr key={row.id} className="border-b transition-colors last:border-0 hover:bg-muted/35">{columns.map((column) => <td key={column.key} className="px-5 py-4">{column.cell(row)}</td>)}</tr>)}</tbody></table></div>;
}
