"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { linkParentChild } from "@/app/(admin)/admin/people/actions";
import { alertError, buttonPrimary, fieldControl, fieldLabel } from "@/lib/ui/styles";

type StudentOption = { id: string; name: string; email: string };
type LinkedChild = { id: string; name: string };

export function ParentChildLinkPanel({
  parentId,
  parentName,
  parentEmail,
  linkedChildren,
  students,
}: {
  parentId: string | null;
  parentName: string;
  parentEmail: string;
  linkedChildren: LinkedChild[];
  students: StudentOption[];
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const linkedIds = useMemo(
    () => new Set(linkedChildren.map((child) => child.id)),
    [linkedChildren],
  );
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students.filter((student) => {
      if (linkedIds.has(student.id)) return false;
      if (!needle) return true;
      return (
        student.name.toLowerCase().includes(needle) ||
        student.email.toLowerCase().includes(needle)
      );
    });
  }, [linkedIds, query, students]);

  function focusSearch() {
    searchRef.current?.focus();
    searchRef.current?.scrollIntoView({ block: "center" });
  }

  async function onLink() {
    if (!parentId || !selectedId) return;
    setError(null);
    setPending(true);
    const result = await linkParentChild(parentId, selectedId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSelectedId(null);
    setQuery("");
    router.refresh();
  }

  return (
    <section className="border border-line bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-6">
        <div>
          <p className="text-sm text-ink-secondary">Selected parent</p>
          <h2 className="mt-1 text-xl font-semibold">{parentName}</h2>
          {parentEmail ? (
            <p className="mt-1 text-sm text-ink-secondary">{parentEmail}</p>
          ) : null}
        </div>
        <button type="button" className={buttonPrimary} onClick={focusSearch} disabled={!parentId}>
          + Link Child
        </button>
      </div>

      <div className="space-y-6 p-6">
        <div>
          <h3 className="font-semibold">Linked children</h3>
          {linkedChildren.length === 0 ? (
            <p className="mt-3 text-sm text-ink-secondary">No children linked yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line border border-line">
              {linkedChildren.map((child) => (
                <li key={child.id} className="px-4 py-3 font-medium">
                  {child.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div id="link-child" className="border border-line bg-surface-muted p-5">
          <p className="font-semibold">Link a child</p>
          <p className="mt-1 text-sm text-ink-secondary">
            Search for a student in this school, then confirm the link.
          </p>
          <div className="mt-4">
            <label className={fieldLabel} htmlFor="search-student">
              Search student
            </label>
            <input
              ref={searchRef}
              id="search-student"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Student name or email"
              className={fieldControl}
              disabled={!parentId}
            />
          </div>
          <div className="mt-4 max-h-64 divide-y divide-line overflow-y-auto border border-line bg-surface">
            {matches.length === 0 ? (
              <p className="p-4 text-sm text-ink-secondary">No matching students.</p>
            ) : (
              matches.map((student) => (
                <label key={student.id} className="flex items-center justify-between gap-4 p-4">
                  <span>
                    <span className="block font-medium">{student.name}</span>
                    <span className="mt-1 block text-sm text-ink-secondary">{student.email}</span>
                  </span>
                  <input
                    type="radio"
                    name="child"
                    checked={selectedId === student.id}
                    onChange={() => setSelectedId(student.id)}
                    className="h-4 w-4"
                  />
                </label>
              ))
            )}
          </div>
          {error ? (
            <p role="alert" className={`${alertError} mt-4`}>
              {error}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              className={buttonPrimary}
              disabled={!parentId || !selectedId || pending}
              onClick={() => void onLink()}
            >
              {pending ? "Linking..." : "Confirm link"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
