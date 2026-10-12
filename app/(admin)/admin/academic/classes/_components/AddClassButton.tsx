"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { emptyClass } from "@/lib/academic/schema";
import { Modal } from "../../_components/Modal";
import { secondaryButtonClass } from "../../_components/FormControls";
import { ClassForm } from "./ClassForm";

export function AddClassButton({ label = "+ Add" }: { label?: string }) {
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
        <Modal title="Add class" onClose={() => setOpen(false)}>
          <ClassForm
            mode="create"
            defaultValues={emptyClass}
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
