"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { YearBounds } from "@/lib/academic/schema";
import { termStatus } from "@/lib/queries/academic";
import type { Term } from "@/lib/types/academic";
import { deleteTerm, markTermCurrent } from "../../actions";
import { DeleteConfirm } from "../../_components/DeleteConfirm";
import { ServerError, quietButtonClass } from "../../_components/FormControls";
import { Modal } from "../../_components/Modal";
import { AddTermButton } from "./AddTermButton";
import { TermForm } from "./TermForm";

export function TermsPanel({
  years,
  currentYear,
  terms,
}: {
  years: YearBounds[];
  currentYear: YearBounds | null;
  terms: Term[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Term | null>(null);
  const [removing, setRemoving] = useState<Term | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function onDelete() {
    if (!removing) return;
    setDeletePending(true);
    setDeleteError(null);
    const result = await deleteTerm(removing.id);
    setDeletePending(false);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    setRemoving(null);
    router.refresh();
  }

  async function onMarkCurrent(term: Term) {
    setActionError(null);
    setMarkingId(term.id);
    const result = await markTermCurrent(term.id);
    setMarkingId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink-secondary">
          {currentYear
            ? `Showing terms for ${currentYear.name}.`
            : "Set a current academic year to list its terms."}
        </p>
        <AddTermButton
          years={years}
          defaultYearId={currentYear?.id ?? ""}
          label="Add term"
        />
      </div>
      <ServerError message={actionError} />
      <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-card">
        <table className="w-full min-w-[36rem] text-sm [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-150 [&_tbody_tr]:hover:bg-surface-muted">
          <thead className="border-b border-line bg-surface text-left text-xs font-medium text-ink-secondary">
            <tr>
              <th className="px-4 py-3">Term</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {terms.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-ink-secondary" colSpan={5}>
                  {currentYear
                    ? "No terms for the current academic year."
                    : "No current academic year."}
                </td>
              </tr>
            ) : (
              terms.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.start_date}</td>
                  <td className="px-4 py-3">{row.end_date}</td>
                  <td className="px-4 py-3">{termStatus(row)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={quietButtonClass}
                        onClick={() => setEditing(row)}
                      >
                        Edit
                      </button>
                      {row.is_current ? null : (
                        <button
                          type="button"
                          className={quietButtonClass}
                          disabled={markingId === row.id}
                          onClick={() => onMarkCurrent(row)}
                        >
                          {markingId === row.id ? "Saving..." : "Mark current"}
                        </button>
                      )}
                      <button
                        type="button"
                        className={quietButtonClass}
                        onClick={() => {
                          setDeleteError(null);
                          setRemoving(row);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <TermForm
            mode="edit"
            termId={editing.id}
            years={years}
            defaultValues={{
              academic_year_id: editing.academic_year_id,
              name: editing.name,
              start_date: editing.start_date,
              end_date: editing.end_date,
              is_current: editing.is_current,
            }}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        </Modal>
      ) : null}

      {removing ? (
        <Modal
          title={`Delete ${removing.name}`}
          onClose={() => {
            if (deletePending) return;
            setRemoving(null);
          }}
        >
          <DeleteConfirm
            name={removing.name}
            pending={deletePending}
            error={deleteError}
            onCancel={() => setRemoving(null)}
            onConfirm={onDelete}
          />
        </Modal>
      ) : null}
    </div>
  );
}
