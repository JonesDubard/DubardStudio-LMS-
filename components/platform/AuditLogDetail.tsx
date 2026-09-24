import type { AuditEventDetail } from "@/lib/stubs/get-audit-log";

type AuditLogDetailProps = {
  detail: AuditEventDetail;
};

export function AuditLogDetail({ detail }: AuditLogDetailProps) {
  return (
    <td colSpan={7} className="px-8 py-5">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-[#999999]">
            Full Context
          </div>
          <p className="mt-2 text-sm">{detail.fullContext}</p>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-[#999999]">
            Access Context
          </div>
          <dl className="mt-2 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#666666]">IP Address</dt>
              <dd>{detail.accessContext.ipAddress}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#666666]">Session ID</dt>
              <dd>{detail.accessContext.sessionId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#666666]">Access Path</dt>
              <dd>{detail.accessContext.accessPath}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 border border-[#999999] p-4">
        <div className="text-xs uppercase tracking-wide text-[#999999]">
          Before / After State
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium">Before</div>
            <div className="mt-2 bg-[#E5E5E5] p-3 text-sm">
              {detail.stateChange.before}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium">After</div>
            <div className="mt-2 bg-[#E5E5E5] p-3 text-sm">
              {detail.stateChange.after}
            </div>
          </div>
        </div>
      </div>
    </td>
  );
}
