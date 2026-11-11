import type { ReactNode } from "react";

export function PersonaShell({
  sidebar,
  mobile,
  children,
}: {
  sidebar: ReactNode;
  mobile: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh min-w-0 overflow-hidden bg-canvas text-ink">
      {sidebar}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {mobile}
        <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}
