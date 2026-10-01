import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E5E5E5] px-4 py-10 text-[#333333]">
      <div className="w-full max-w-sm border border-[#999999] bg-white p-6">
        {children}
      </div>
    </div>
  );
}
