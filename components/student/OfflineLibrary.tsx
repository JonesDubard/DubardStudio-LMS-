"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Card } from "@/components/shared/Card";
import { readAccessTokenClaims } from "@/lib/auth/claims";
import { offlineDb, type SavedLesson } from "@/lib/offline/db";
import { createClient } from "@/lib/supabase/client";
import { buttonSecondary } from "@/lib/ui/styles";

export function OfflineLibrary() {
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let requestId = 0;
    const supabase = createClient();

    async function readForSession(session: Session | null) {
      const currentRequestId = ++requestId;
      setLessons([]);
      setExpandedLessonId(null);
      setError(null);
      setLoading(true);

      if (!session) {
        if (active && currentRequestId === requestId) setLoading(false);
        return;
      }

      const claims = readAccessTokenClaims(session.access_token);
      const tenantId = claims.tenantId;
      const studentId = session.user.id;
      if (!tenantId || !claims.app_roles.includes("student")) {
        if (active && currentRequestId === requestId) {
          setError("Sign in with a student account to view offline lessons.");
          setLoading(false);
        }
        return;
      }

      try {
        const savedLessons = await offlineDb.saved_lessons
          .where("[tenantId+studentId]")
          .equals([tenantId, studentId])
          .toArray();
        if (active && currentRequestId === requestId) {
          setLessons(savedLessons.sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
        }
      } catch (cause) {
        if (active && currentRequestId === requestId) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Saved lessons could not be read from this device.",
          );
        }
      } finally {
        if (active && currentRequestId === requestId) setLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void readForSession(session);
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) {
        setError(sessionError.message);
        setLoading(false);
        return;
      }
      void readForSession(data.session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-8 md:py-8">
      {loading ? (
        <p role="status" className="text-sm text-ink-secondary">
          Loading saved lessons from this device...
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-danger-border bg-danger-subtle px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {!loading && !error && lessons.length === 0 ? (
        <Card className="p-5">
          <h2 className="font-semibold text-ink">No saved lessons yet</h2>
          <p className="mt-1 text-sm leading-6 text-ink-secondary">
            Save a lesson while online and it will be available here on this device.
          </p>
        </Card>
      ) : null}
      {lessons.map((lesson) => {
        const expanded = expandedLessonId === lesson.id;
        const cachedPdfs = lesson.pdfUrls.filter((url) =>
          url.startsWith("/__offline-pdf/"),
        );
        return (
          <Card key={`${lesson.tenantId}:${lesson.studentId}:${lesson.id}`} className="p-5">
            <p className="text-xs font-medium text-ink-muted">
              Saved {new Date(lesson.savedAt).toLocaleString()}
            </p>
            <h2 className="mt-1 break-words text-lg font-semibold tracking-tight text-ink">
              {lesson.title}
            </h2>
            {lesson.description ? (
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">
                {lesson.description}
              </p>
            ) : null}
            <button
              type="button"
              aria-expanded={expanded}
              className={`${buttonSecondary} mt-4 w-full sm:w-auto`}
              onClick={() =>
                setExpandedLessonId(expanded ? null : lesson.id)
              }
            >
              {expanded ? "Close Lesson" : "Read Offline"}
            </button>
            {expanded ? (
              <div className="mt-4 border-t border-line pt-4">
                <p className="whitespace-pre-wrap text-sm leading-7 text-ink">
                  {lesson.htmlContent || "No text content was saved for this lesson."}
                </p>
                {cachedPdfs.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-ink">PDF files</h3>
                    <ul className="mt-2 space-y-2">
                        {cachedPdfs.map((url, index) => (
                        <li key={url}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-brand-primary underline underline-offset-2"
                          >
                            Open saved PDF {index + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>
        );
      })}
    </section>
  );
}
