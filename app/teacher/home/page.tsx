import type { Metadata } from "next";
import { ClassCard } from "@/components/teacher/ClassCard";
import { GradingQueueRow } from "@/components/teacher/GradingQueueRow";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { getTeacherHome } from "@/lib/stubs/get-teacher-home";

export const metadata: Metadata = {
  title: "Teacher Home",
};

export default function TeacherHomePage() {
  const home = getTeacherHome();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-[#999999] bg-white px-8 py-6">
        <p className="text-sm text-[#666666]">{home.eyebrow}</p>
        <h1 className="text-2xl font-semibold">{home.greeting}</h1>
        <p className="mt-1 text-sm text-[#666666]">{home.dateLabel}</p>
      </header>

      <div className="space-y-8 p-8">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">My Classes</h2>
              <p className="text-sm text-[#666666]">
                Classes and subjects assigned to you.
              </p>
            </div>
            <button
              type="button"
              className="border border-[#999999] bg-white px-4 py-2 text-sm"
            >
              View Classes
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {home.classes.map((classItem) => (
              <ClassCard
                key={classItem.id}
                name={classItem.name}
                subject={classItem.subject}
                studentCountLabel={classItem.studentCountLabel}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Pending Grading</h2>
              <p className="text-sm text-[#666666]">
                Work and assessments requiring your attention.
              </p>
            </div>
            <button
              type="button"
              className="border border-[#999999] bg-white px-4 py-2 text-sm"
            >
              Open Grading
            </button>
          </div>

          <div className="overflow-x-auto border border-[#999999] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#E5E5E5] text-left">
                <tr>
                  <th className="px-4 py-3">Assessment</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Pending</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {home.pendingGrading.map((item) => (
                  <GradingQueueRow
                    key={item.id}
                    title={item.title}
                    className={item.className}
                    typeLabel={item.typeLabel}
                    pendingLabel={item.pendingLabel}
                    actionLabel={item.actionLabel}
                    href={item.href}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Upcoming Assignments</h2>
            <p className="text-sm text-[#666666]">
              Assignments scheduled for your classes.
            </p>
          </div>

          <div className="overflow-x-auto border border-[#999999] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#E5E5E5] text-left">
                <tr>
                  <th className="px-4 py-3">Assignment</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Lesson</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {home.upcomingAssignments.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4">{item.title}</td>
                    <td className="px-4 py-4">{item.className}</td>
                    <td className="px-4 py-4">{item.lessonTitle}</td>
                    <td className="px-4 py-4">{item.dueLabel}</td>
                    <td className="px-4 py-4">
                      <StatusBadge label={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
