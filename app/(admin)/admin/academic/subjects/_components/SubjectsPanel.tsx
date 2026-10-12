"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClassSubjectInput } from "@/lib/academic/schema";
import { deleteClassSubject, deleteSubject } from "../../actions";
import { DeleteConfirm } from "../../_components/DeleteConfirm";
import {
  ServerError,
  quietButtonClass,
  secondaryButtonClass,
} from "../../_components/FormControls";
import { Modal } from "../../_components/Modal";
import { AddSubjectButton } from "./AddSubjectButton";
import { LinkSubjectForm } from "./LinkSubjectForm";
import { SubjectForm } from "./SubjectForm";

type Option = { id: string; name: string };

export type SubjectLink = { id: string; className: string };

export type SubjectRow = {
  id: string;
  name: string;
  links: SubjectLink[];
};

type UnlinkTarget = {
  id: string;
  subjectName: string;
  className: string;
};

export function SubjectsPanel({
  subjects,
  classes,
}: {
  subjects: SubjectRow[];
  classes: Option[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const [removing, setRemoving] = useState<SubjectRow | null>(null);
  const [linking, setLinking] = useState<ClassSubjectInput | null>(null);
  const [unlinking, setUnlinking] = useState<UnlinkTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [unlinkPending, setUnlinkPending] = useState(false);

  function refresh() {
    router.refresh();
  }

  async function onDelete() {
    if (!removing) return;
    setDeletePending(true);
    setDeleteError(null);
    const result = await deleteSubject(removing.id);
    setDeletePending(false);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    setRemoving(null);
    refresh();
  }

  async function onUnlink() {
    if (!unlinking) return;
    setUnlinkPending(true);
    setUnlinkError(null);
    const result = await deleteClassSubject(unlinking.id);
    setUnlinkPending(false);
    if (!result.ok) {
      setUnlinkError(result.error);
      return;
    }
    setUnlinking(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            setLinking({
              class_id: "",
              subject_id: "",
            })
          }
        >
          Link to class
        </button>
        <AddSubjectButton label="Add subject" />
      </div>
      <div className="overflow-x-auto border border-[#999999] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#E5E5E5] text-left">
            <tr>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Classes</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {subjects.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-[#666666]" colSpan={3}>
                  No subjects yet.
                </td>
              </tr>
            ) : (
              subjects.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">
                    {row.links.length === 0 ? (
                      "—"
                    ) : (
                      <ul className="space-y-2">
                        {row.links.map((link) => (
                          <li
                            key={link.id}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <span>{link.className}</span>
                            <button
                              type="button"
                              className={quietButtonClass}
                              onClick={() => {
                                setUnlinkError(null);
                                setUnlinking({
                                  id: link.id,
                                  subjectName: row.name,
                                  className: link.className,
                                });
                              }}
                            >
                              Unlink
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={quietButtonClass}
                        onClick={() =>
                          setLinking({
                            class_id: "",
                            subject_id: row.id,
                          })
                        }
                      >
                        Link
                      </button>
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
          <SubjectForm
            mode="edit"
            subjectId={editing.id}
            defaultValues={{ name: editing.name }}
            onDone={() => {
              setEditing(null);
              refresh();
            }}
          />
        </Modal>
      ) : null}

      {linking ? (
        <Modal title="Link subject to class" onClose={() => setLinking(null)}>
          <LinkSubjectForm
            classes={classes}
            subjects={subjects.map((row) => ({ id: row.id, name: row.name }))}
            defaultValues={linking.subject_id ? linking : { ...linking }}
            onDone={() => {
              setLinking(null);
              refresh();
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

      {unlinking ? (
        <Modal
          title={`Unlink ${unlinking.subjectName}`}
          onClose={() => {
            if (unlinkPending) return;
            setUnlinking(null);
          }}
        >
          <div className="space-y-4">
            <p>
              Are you sure? This removes {unlinking.subjectName} from{" "}
              {unlinking.className} records
            </p>
            <ServerError message={unlinkError} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={quietButtonClass}
                disabled={unlinkPending}
                onClick={() => setUnlinking(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={quietButtonClass}
                disabled={unlinkPending}
                onClick={onUnlink}
              >
                {unlinkPending ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
