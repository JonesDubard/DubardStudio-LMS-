import type { ReactNode } from "react";

export type DataTableColumn = {
  key: string;
  header: string;
  className?: string;
};

export type DataTableCell = ReactNode;

export type DataTableRow = {
  id: string;
  cells: DataTableCell[];
};

type DataTableProps = {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  headerCellClassName?: string;
  bodyCellClassName?: string;
  wrapperClassName?: string;
  tableClassName?: string;
  rowClassName?: string;
};

export function DataTable({
  columns,
  rows,
  headerCellClassName = "px-5 py-4",
  bodyCellClassName = "px-5 py-4",
  wrapperClassName = "overflow-x-auto border border-[#999999] bg-white",
  tableClassName = "w-full text-sm",
  rowClassName,
}: DataTableProps) {
  return (
    <div className={wrapperClassName}>
      <table className={tableClassName}>
        <thead className="bg-[#E5E5E5] text-left">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={column.className ?? headerCellClassName}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E5E5]">
          {rows.map((row) => (
            <tr key={row.id} className={rowClassName}>
              {row.cells.map((cell, index) => (
                <td
                  key={`${row.id}-${columns[index]?.key ?? index}`}
                  className={bodyCellClassName}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
