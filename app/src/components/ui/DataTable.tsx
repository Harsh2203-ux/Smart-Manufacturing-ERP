/**
 * components/ui/DataTable.tsx
 * Generic, reusable table component with sticky header.
 */
import type { ReactNode, CSSProperties } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  style?: CSSProperties;
  headerStyle?: CSSProperties;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns, rows, rowKey, emptyMessage = "No data available.",
}: DataTableProps<T>) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "13px",
      }}>
        <thead>
          <tr style={{ background: "var(--table-head-bg)" }}>
            {columns.map((col) => (
              <th key={col.key} style={{
                padding: "10px 16px",
                fontWeight: 600,
                color: "var(--text)",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                borderBottom: "1px solid var(--card-border)",
                textAlign: "left",
                whiteSpace: "nowrap",
                ...col.headerStyle,
              }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "var(--text)",
                fontSize: "13px",
              }}>
                {emptyMessage}
              </td>
            </tr>
          ) : rows.map((row, idx) => (
            <tr key={rowKey(row)} style={{
              background: idx % 2 === 0 ? "transparent" : "var(--table-stripe-bg)",
            }}>
              {columns.map((col) => (
                <td key={col.key} style={{
                  padding: "12px 16px",
                  color: "var(--text-h)",
                  borderBottom: idx === rows.length - 1 ? "none" : "1px solid var(--card-border)",
                  ...col.style,
                }}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
