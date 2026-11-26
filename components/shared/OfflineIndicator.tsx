"use client";

import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    function updateConnectionStatus() {
      setIsOnline(navigator.onLine);
    }

    updateConnectionStatus();
    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);

    return () => {
      window.removeEventListener("online", updateConnectionStatus);
      window.removeEventListener("offline", updateConnectionStatus);
    };
  }, []);

  if (isOnline !== false) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex min-h-11 items-center justify-center border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950 shadow-sm"
    >
      You are offline. Viewing saved lessons.
    </div>
  );
}
