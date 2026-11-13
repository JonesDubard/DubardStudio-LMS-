"use client";

import { useEffect } from "react";

/** Drops a production worker left on localhost. Device mode reloads through it and the page fails. */
export function DevServiceWorkerReset() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister();
      }
    });
  }, []);

  return null;
}
