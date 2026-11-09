"use client";

import { useState } from "react";
import { AuditLogDetail } from "@/components/platform/AuditLogDetail";
import type { AuditEvent } from "@/lib/stubs/get-audit-log";

type AuditLogRowProps = {
  event: AuditEvent;
};

export function AuditLogRow({ event }: AuditLogRowProps) {
  const [expanded, setExpanded] = useState(event.expandedByDefault);

  return (
    <>
      <tr
        className={
          expanded
            ? "border-t border-line-subtle bg-surface-muted"
            : "border-t border-line-subtle"
        }
      >
        <td className="px-4 py-4 font-medium">
          <button
            type="button"
            className="font-medium"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? "−" : "+"}
          </button>
        </td>
        <td className="px-4 py-4">{event.timestamp}</td>
        <td className="px-4 py-4">{event.admin}</td>
        <td className="px-4 py-4">{event.tenant}</td>
        <td className="px-4 py-4">{event.action}</td>
        <td className="px-4 py-4">{event.resource}</td>
        <td className="px-4 py-4">{event.result}</td>
      </tr>

      {expanded && event.detail ? (
        <tr className="border-t border-line">
          <AuditLogDetail detail={event.detail} />
        </tr>
      ) : null}
    </>
  );
}
