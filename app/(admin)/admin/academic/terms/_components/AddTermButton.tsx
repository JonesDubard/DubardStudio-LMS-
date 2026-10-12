"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TermInput, YearBounds } from "@/lib/academic/schema";
import { Modal } from "../../_components/Modal";
import { secondaryButtonClass } from "../../_components/FormControls";
import { TermForm } from "./TermForm";

function emptyTerm(yearId: string): TermInput {
  return {
    academic_year_id: yearId,
    name: "",
    start_date: "",
    end_date: "",
    is_current: false,
  };
}

export function AddTermButton({
  years,
  defaultYearId,
  label = "+ Add",
}: {
  years: YearBounds[];
  defaultYearId: string;
  label?: string;
}) {
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
        <Modal title="Add term" onClose={() => setOpen(false)}>
          <TermForm
            mode="create"
            years={years}
            defaultValues={emptyTerm(defaultYearId)}
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
