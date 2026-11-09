import { UploadZone } from "@/components/shared/UploadZone";

export type BulkImportPreviewColumn = {
  key: string;
  header: string;
};

export type BulkImportPreviewRow = {
  id: string;
  cells: string[];
};

type BulkImportPanelProps = {
  title: string;
  description: string;
  uploadTitle: string;
  uploadDescription: string;
  uploadButtonLabel: string;
  previewTitle: string;
  columns: BulkImportPreviewColumn[];
  rows: BulkImportPreviewRow[];
};

export function BulkImportPanel({
  title,
  description,
  uploadTitle,
  uploadDescription,
  uploadButtonLabel,
  previewTitle,
  columns,
  rows,
}: BulkImportPanelProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6 shadow-card">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-ink-secondary">{description}</p>
      </div>

      <div className="mt-5">
        <UploadZone
          title={uploadTitle}
          description={uploadDescription}
          buttonLabel={uploadButtonLabel}
        />
      </div>

      <div className="mt-6">
        <h3 className="font-medium">{previewTitle}</h3>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface text-left text-sm font-medium text-ink-secondary">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors duration-150 hover:bg-surface-muted">
                  {row.cells.map((cell, index) => (
                    <td
                      key={`${row.id}-${columns[index]?.key ?? index}`}
                      className="px-4 py-3"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
