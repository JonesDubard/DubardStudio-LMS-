"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Class as SchoolClass } from "@/lib/types/academic";
import { deleteClass } from "../../actions";
import { DeleteConfirm } from "../../_components/DeleteConfirm";
import { quietButtonClass } from "../../_components/FormControls";
import { Modal } from "../../_components/Modal";
import { AddClassButton } from "./AddClassButton";
import { ClassForm } from "./ClassForm";

export function ClassesPanel({ classes }: { classes: SchoolClass[] }) {
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
      <div className="overflow-x-auto border border-[#999999] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#E5E5E5] text-left">
            <tr>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Grade level</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {classes.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-[#666666]" colSpan={3}>
                  No classes yet.
                </td>
              </tr>
            ) : (
              classes.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.grade_level ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={quietButtonClass}
                        onClick={() => setEditing(row)}
                      >
                        Edit
                      </button>
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
          <ClassForm
            mode="edit"
            classId={editing.id}
            defaultValues={{
              name: editing.name,
              grade_level: editing.grade_level ?? "",
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
