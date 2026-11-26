"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { openLessonMaterial } from "@/lib/queries/assessments";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import { offlineDb } from "@/lib/offline/db";
import { createClient } from "@/lib/supabase/client";
import { alertError, buttonPrimary } from "@/lib/ui/styles";

type OfflineMaterial = {
  id: string;
  kind: string;
  externalUrl: string | null;
  downloadable: boolean;
};

type SaveOfflineButtonProps = {
  tenantId: string;
  studentId: string;
  lesson: {
    id: string;
    title: string;
    description: string | null;
    materials: OfflineMaterial[];
  };
};

export function SaveOfflineButton({
  tenantId,
  studentId,
  lesson,
}: SaveOfflineButtonProps) {
  const [status, setStatus] = useState<"ready" | "saving" | "saved">("ready");
  const [error, setError] = useState<string | null>(null);
  const [pdfWarning, setPdfWarning] = useState<string | null>(null);
  const pdfCount = lesson.materials.filter(
    (material) => material.kind === "pdf",
  ).length;

  useEffect(() => {
    let active = true;

    offlineDb.saved_lessons
      .get([tenantId, studentId, lesson.id])
      .then((savedLesson) => {
        if (active && savedLesson) {
          setStatus("saved");
          if (pdfCount > savedLesson.pdfUrls.length) {
            setPdfWarning(
              "Lesson text is saved, but some PDFs are not available offline.",
            );
          }
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not check offline storage.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [lesson.id, pdfCount, studentId, tenantId]);

  async function saveOffline() {
    setError(null);
    setPdfWarning(null);
    setStatus("saving");
    let lessonSaved = false;

    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw new Error(sessionError.message);

      const session = sessionData.session;
      const claims = session
        ? readAccessTokenClaims(session.access_token)
        : null;
      if (
        !session ||
        session.user.id !== studentId ||
        claims?.tenantId !== tenantId ||
        !claims.app_roles.includes("student")
      ) {
        throw new Error("Your student session changed. Refresh and try again.");
      }
      const currentStudentId = session.user.id;
      const currentTenantId = claims.tenantId;

      const pdfMaterials = lesson.materials.filter(
        (material) => material.kind === "pdf",
      );
      const description = lesson.description ?? "";
      await offlineDb.saved_lessons.put({
        id: lesson.id,
        tenantId: currentTenantId,
        studentId: currentStudentId,
        title: lesson.title,
        description: lesson.description,
        htmlContent: description,
        pdfUrls: [],
        savedAt: new Date().toISOString(),
      });
      lessonSaved = true;
      setStatus("saved");

      if (pdfMaterials.length === 0) return;

      let cache: Cache | null = null;
      try {
        if (typeof caches === "undefined") {
          throw new Error("Cache storage is not available in this browser.");
        }
        cache = await caches.open("pdf-cache");
      } catch (cause) {
        console.error("Could not open the offline PDF cache.", {
          lessonId: lesson.id,
          error: cause instanceof Error ? cause.message : "Unknown cache error",
        });
      }

      const cachedPdfUrls = cache
        ? (
            await Promise.all(
              pdfMaterials.map(async (material) => {
                try {
                  let sourceUrl = material.externalUrl;
                  if (!sourceUrl) {
                    if (!material.downloadable) {
                      throw new Error("The PDF is not available to download.");
                    }
                    const result = await openLessonMaterial(material.id);
                    if (!result.ok) throw new Error(result.error);
                    sourceUrl = result.url;
                  }

                  const response = await fetch(sourceUrl, {
                    cache: "no-store",
                    credentials: "omit",
                  });
                  if (!response.ok) {
                    throw new Error(`PDF request failed (${response.status}).`);
                  }
                  const contentType = response.headers
                    .get("content-type")
                    ?.split(";")[0]
                    .trim()
                    .toLowerCase();
                  if (
                    contentType &&
                    ![
                      "application/pdf",
                      "application/octet-stream",
                      "application/x-pdf",
                      "binary/octet-stream",
                    ].includes(contentType)
                  ) {
                    throw new Error("The response was not a PDF file.");
                  }

                  const cacheKey = `/__offline-pdf/${crypto.randomUUID()}`;
                  await cache.put(cacheKey, response.clone());
                  return cacheKey;
                } catch (cause) {
                  console.error("Could not cache an offline lesson PDF.", {
                    lessonId: lesson.id,
                    materialId: material.id,
                    error:
                      cause instanceof Error
                        ? cause.message
                        : "Unknown PDF caching error",
                  });
                  return null;
                }
              }),
            )
          ).filter((url): url is string => url !== null)
        : [];

      const failedPdfCount = pdfMaterials.length - cachedPdfUrls.length;
      try {
        await offlineDb.saved_lessons.update(
          [currentTenantId, currentStudentId, lesson.id],
          { pdfUrls: cachedPdfUrls },
        );
      } catch (cause) {
        console.error("Could not save cached PDF references.", {
          lessonId: lesson.id,
          error:
            cause instanceof Error
              ? cause.message
              : "Unknown IndexedDB error",
        });
        setPdfWarning(
          "Lesson text is saved, but offline PDF links could not be recorded.",
        );
        return;
      }
      if (failedPdfCount > 0) {
        setPdfWarning(
          `Lesson text is saved, but ${failedPdfCount} PDF${failedPdfCount === 1 ? "" : "s"} could not be saved for offline use.`,
        );
      }
    } catch (cause) {
      if (lessonSaved) {
        setStatus("saved");
        setPdfWarning(
          "Lesson text is saved, but PDF caching could not be completed.",
        );
      } else {
        setStatus("ready");
        setError(
          cause instanceof Error
            ? cause.message
            : "The lesson could not be saved offline.",
        );
      }
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={status === "saving" || (status === "saved" && !pdfWarning)}
        onClick={() => void saveOffline()}
        className={`${buttonPrimary} w-full sm:w-auto`}
      >
        <Download size={16} aria-hidden />
        {status === "saving"
          ? "Saving..."
          : status === "saved"
            ? "Saved Offline"
            : "Save Offline"}
      </button>
      {error ? (
        <p role="alert" className={`${alertError} max-w-sm`}>
          {error}
        </p>
      ) : null}
      {pdfWarning ? (
        <p role="status" className="max-w-sm text-xs leading-5 text-amber-800">
          {pdfWarning}
        </p>
      ) : null}
    </div>
  );
}
