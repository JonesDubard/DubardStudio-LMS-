export interface AcademicProgressStep {
  id: string;
  number: string;
  label: string;
  active: boolean;
}

export interface AcademicYearRow {
  id: string;
  year: string;
  status: string;
}

export interface TermRow {
  id: string;
  term: string;
  status: string;
}

export interface ClassRow {
  id: string;
  name: string;
  students: string;
}

export interface SubjectRow {
  id: string;
  name: string;
  classes: string;
}

export interface AcademicStructure {
  schoolName: string;
  portalLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  progressEyebrow: string;
  progressTitle: string;
  progressSteps: AcademicProgressStep[];
  years: AcademicYearRow[];
  terms: TermRow[];
  classes: ClassRow[];
  subjects: SubjectRow[];
  saveLabel: string;
}

export function getAcademicStructure(): AcademicStructure {
  return {
    schoolName: "Pilot School #1",
    portalLabel: "School Admin",
    eyebrow: "Academic / Setup",
    title: "Academic Setup",
    subtitle: "Configure the academic structure for the school.",
    progressEyebrow: "Setup Progress",
    progressTitle: "Academic Structure",
    progressSteps: [
      { id: "years", number: "1", label: "Academic Years", active: true },
      { id: "terms", number: "2", label: "Terms", active: true },
      { id: "classes", number: "3", label: "Classes", active: true },
      { id: "subjects", number: "4", label: "Subjects", active: false },
    ],
    years: [
      { id: "1", year: "2026/2027", status: "Current" },
      { id: "2", year: "2025/2026", status: "Past" },
    ],
    terms: [
      { id: "1", term: "Term 1", status: "Current" },
      { id: "2", term: "Term 2", status: "Upcoming" },
      { id: "3", term: "Term 3", status: "Upcoming" },
    ],
    classes: [
      { id: "1", name: "JSS 2A", students: "32" },
      { id: "2", name: "JSS 2B", students: "29" },
      { id: "3", name: "JSS 3A", students: "31" },
    ],
    subjects: [
      {
        id: "1",
        name: "Mathematics",
        classes: "JSS 2A, JSS 2B",
      },
      {
        id: "2",
        name: "English Language",
        classes: "JSS 2A, JSS 2B",
      },
      {
        id: "3",
        name: "Integrated Science",
        classes: "JSS 3A",
      },
    ],
    saveLabel: "Save Academic Structure",
  };
}
