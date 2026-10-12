"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { emptyAcademicYear } from "@/lib/academic/schema";
import { Modal } from "../../_components/Modal";
import { secondaryButtonClass } from "../../_components/FormControls";
import { YearForm } from "./YearForm";

export function AddYearButton({ label = "+ Add" }: { label?: string }) {
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
        <Modal title="Add academic year" onClose={() => setOpen(false)}>
          <YearForm
            mode="create"
            defaultValues={emptyAcademicYear}
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
