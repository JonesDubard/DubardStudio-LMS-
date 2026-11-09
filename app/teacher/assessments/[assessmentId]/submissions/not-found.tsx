import Link from "next/link";

export default function AssessmentNotFound() {
  return (
    <main className="min-w-0 flex-1 p-8">
      <h1 className="text-2xl font-semibold">Assessment not found</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        This assessment is not available. It may belong to another school.
      </p>
      <Link href="/teacher/lessons" className="mt-4 inline-block text-sm underline">
        Back to lessons
      </Link>
    </main>
  );
}
