"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { emptySubject } from "@/lib/academic/schema";
import { Modal } from "../../_components/Modal";
import { secondaryButtonClass } from "../../_components/FormControls";
import { SubjectForm } from "./SubjectForm";

export function AddSubjectButton({ label = "+ Add" }: { label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={secondaryButtonClass}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open ? (
        <Modal title="Add subject" onClose={() => setOpen(false)}>
          <SubjectForm
            mode="create"
            defaultValues={emptySubject}
            onDone={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        </Modal>
      ) : null}
    </>
  );
}
