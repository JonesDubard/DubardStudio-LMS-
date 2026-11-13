"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  importPeopleCsv,
  type ImportPeopleResult,
  type ImportRole,
} from "@/app/(admin)/admin/people/import-actions";
import { Modal } from "@/app/(admin)/admin/academic/_components/Modal";
import { alertError, buttonPrimary, buttonSecondary } from "@/lib/ui/styles";

const templates: Record<ImportRole, { fileName: string; header: string }> = {
  student: {
    fileName: "students-template.csv",
    header: "first_name,last_name,email,class_name\n",
  },
  teacher: {
    fileName: "teachers-template.csv",
    header: "first_name,last_name,email,class_name,subject_name\n",
  },
};

function downloadTemplate(role: ImportRole) {
  const template = templates[role];
  const url = URL.createObjectURL(new Blob([template.header], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = template.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function BulkImportDialog({ role }: { role: ImportRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportPeopleResult | null>(null);
  const [pending, setPending] = useState(false);
  const noun = role === "student" ? "students" : "teachers";

  function close() {
    if (pending) return;
    setOpen(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a CSV file.");
      return;
    }
    setError(null);
    setResult(null);
    setPending(true);
    const body = new FormData();
    body.set("file", file);
    const imported = await importPeopleCsv(role, body);
    setPending(false);
    if (!imported.ok) {
      setError(imported.error);
      return;
    }
    setResult(imported);
    if (imported.rows.some((row) => row.ok)) router.refresh();
  }

  const rows = result && result.ok ? result.rows : [];
  const created = rows.filter((row) => row.ok).length;

  return (
    <>
      <button
        type="button"
        className={buttonSecondary}
        onClick={() => {
          setError(null);
          setResult(null);
          setFile(null);
          setOpen(true);
        }}
      >
        Bulk Import CSV
      </button>
      {open ? (
        <Modal title={`Import ${noun}`} onClose={close}>
          <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
            <p className="text-sm text-ink-secondary">
              Up to 100 rows. Each new account gets a temporary password shown once in the report.
            </p>
            <button
              type="button"
              className={buttonSecondary}
              onClick={() => downloadTemplate(role)}
            >
              Download sample CSV
            </button>
            <input
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {error ? (
              <p role="alert" className={alertError}>
                {error}
              </p>
            ) : null}
            <button type="submit" className={buttonPrimary} disabled={pending}>
              {pending ? "Importing..." : "Upload CSV"}
            </button>
          </form>
          {result && result.ok ? (
            <div className="mt-5 space-y-2">
              <p className="text-sm font-medium">
                {created} created, {rows.length - created} skipped.
              </p>
              <div className="max-h-64 overflow-auto border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted text-left text-xs text-ink-secondary">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Result</th>
                      <th className="px-3 py-2">Temporary password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((row) => (
                      <tr key={`${row.row}-${row.email}`}>
                        <td className="px-3 py-2">{row.row}</td>
                        <td className="px-3 py-2">{row.email || "—"}</td>
                        <td className="px-3 py-2">{row.ok ? "Created" : row.message}</td>
                        <td className="px-3 py-2">{row.temporaryPassword ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
