"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { classDisplayName } from "@/lib/academic/labels";
import type { Class as SchoolClass } from "@/lib/types/academic";
import { deleteClass } from "../../actions";
import { DeleteConfirm } from "../../_components/DeleteConfirm";
import { Modal } from "../../_components/Modal";
import { AddClassButton } from "./AddClassButton";
import { ClassForm } from "./ClassForm";

export function ClassesPanel({
  classes,
  teachersByClass,
  studentCountByClass,
}: {
  classes: SchoolClass[];
  teachersByClass: Record<string, string[]>;
  studentCountByClass: Record<string, number>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [removing, setRemoving] = useState<SchoolClass | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  async function onDelete() {
    if (!removing) return;
    setDeletePending(true);
    setDeleteError(null);
    const result = await deleteClass(removing.id);
    setDeletePending(false);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    setRemoving(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <AddClassButton label="Add class" />
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-card">
        <table className="w-full min-w-[36rem] text-sm [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-150 [&_tbody_tr]:hover:bg-surface-muted">
          <thead className="border-b border-line bg-surface text-left text-xs font-medium text-ink-secondary">
            <tr>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Teachers</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {classes.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-ink-secondary" colSpan={4}>
                  No classes yet.
                </td>
              </tr>
            ) : (
              classes.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    {classDisplayName(
                      row.name,
                      row.id,
                      classes.map((item) => item.name),
                    )}
                  </td>
                  <td className="px-4 py-3">{studentCountByClass[row.id] ?? 0}</td>
                  <td className="px-4 py-3">
                    {(teachersByClass[row.id] ?? []).join(", ") || "Unassigned"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-nowrap items-center gap-1">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                        onClick={() => setEditing(row)}
                        aria-label={`Edit ${row.name}`}
                        title="Edit"
                      >
                        <Pencil size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-danger-subtle hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-border"
                        onClick={() => {
                          setDeleteError(null);
                          setRemoving(row);
                        }}
                        aria-label={`Delete ${row.name}`}
                        title="Delete"
                      >
                        <Trash2 size={16} aria-hidden />
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
          <ClassForm
            mode="edit"
            classId={editing.id}
            defaultValues={{
              name: editing.name,
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
