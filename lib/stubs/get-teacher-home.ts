export type AssessmentType = "assignment" | "quiz" | "test" | "exam";

export interface TeacherClass {
  id: string;
  name: string;
  subject: string;
  studentCountLabel: string;
}

export interface PendingGradingItem {
  id: string;
  title: string;
  className: string;
  type: AssessmentType;
  typeLabel: string;
  pendingLabel: string;
  actionLabel: string;
  href: string;
}

export interface UpcomingAssignment {
  id: string;
  title: string;
  className: string;
  lessonTitle: string;
  dueLabel: string;
  status: string;
}

export interface TeacherHome {
  teacherName: string;
  portalLabel: string;
  eyebrow: string;
  greeting: string;
  dateLabel: string;
  classes: TeacherClass[];
  pendingGrading: PendingGradingItem[];
  upcomingAssignments: UpcomingAssignment[];
}

export function getTeacherHome(): TeacherHome {
  return {
    teacherName: "Mrs. Sarah Johnson",
    portalLabel: "Teacher Portal",
    eyebrow: "Teacher Home",
    greeting: "Good morning, Mrs. Johnson",
    dateLabel: "Tuesday, 17 September",
    classes: [
      {
        id: "1",
        name: "JSS 2A",
        subject: "Mathematics",
        studentCountLabel: "32 students",
      },
      {
        id: "2",
        name: "JSS 2B",
        subject: "Mathematics",
        studentCountLabel: "29 students",
      },
      {
        id: "3",
        name: "JSS 3A",
        subject: "Mathematics",
        studentCountLabel: "31 students",
      },
    ],
    pendingGrading: [
      {
        id: "1",
        title: "Reading Response",
        className: "JSS 2A",
        type: "assignment",
        typeLabel: "Assignment",
        pendingLabel: "12 submissions",
        actionLabel: "Grade",
        href: "/teacher/assignments/1/submissions",
      },
      {
        id: "2",
        title: "Week 3 Quiz",
        className: "JSS 2B",
        type: "quiz",
        typeLabel: "Quiz",
        pendingLabel: "29 scores",
        actionLabel: "Enter Scores",
        href: "/teacher/assessments/1/grade-entry",
      },
    ],
    upcomingAssignments: [
      {
        id: "1",
        title: "Reading Response",
        className: "JSS 2A",
        lessonTitle: "Reading Comprehension",
        dueLabel: "Friday 20 Sept, 8:00 PM",
        status: "PUBLISHED",
      },
      {
        id: "2",
        title: "Fractions Practice",
        className: "JSS 2B",
        lessonTitle: "Adding Fractions",
        dueLabel: "Monday 23 Sept, 8:00 PM",
        status: "DRAFT",
      },
    ],
  };
}
