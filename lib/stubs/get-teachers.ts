export interface TeacherRow {
  id: string;
  name: string;
  email: string;
  classesAssigned: string;
  status: string;
  actionLabel: string;
}

export interface CsvPreviewRow {
  id: string;
  name: string;
  email: string;
  subjects: string;
}

export interface TeachersList {
  schoolName: string;
  portalLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  countLabel: string;
  breakdownLabel: string;
  bulkImportButtonLabel: string;
  inviteButtonLabel: string;
  teachers: TeacherRow[];
  importTitle: string;
  importDescription: string;
  uploadTitle: string;
  uploadDescription: string;
  uploadButtonLabel: string;
  previewTitle: string;
  csvColumns: { key: string; header: string }[];
  csvRows: CsvPreviewRow[];
}

export function getTeachers(): TeachersList {
  return {
    schoolName: "Pilot School #1",
    portalLabel: "School Admin",
    eyebrow: "People / Teachers",
    title: "Teachers",
    subtitle: "Manage teacher invitations and class assignments.",
    countLabel: "6 teachers",
    breakdownLabel: "3 active · 3 invited",
    bulkImportButtonLabel: "Bulk Import CSV",
    inviteButtonLabel: "+ Invite Teacher",
    teachers: [
      {
        id: "1",
        name: "Mrs. Abena Kollie",
        email: "abena.kollie@example.com",
        classesAssigned: "JSS 2A, JSS 2B",
        status: "ACTIVE",
        actionLabel: "Assign",
      },
      {
        id: "2",
        name: "Mr. Samuel Cooper",
        email: "samuel.cooper@example.com",
        classesAssigned: "JSS 3A",
        status: "ACTIVE",
        actionLabel: "Assign",
      },
      {
        id: "3",
        name: "Mrs. Martha Kromah",
        email: "martha.kromah@example.com",
        classesAssigned: "Not assigned",
        status: "INVITED",
        actionLabel: "Assign",
      },
    ],
    importTitle: "Bulk Import Teachers",
    importDescription: "Upload a CSV containing teacher information.",
    uploadTitle: "Drop CSV file here",
    uploadDescription: "or choose a file from your computer",
    uploadButtonLabel: "Choose CSV File",
    previewTitle: "CSV Column Preview",
    csvColumns: [
      { key: "name", header: "name" },
      { key: "email", header: "email" },
      { key: "subjects", header: "subjects" },
    ],
    csvRows: [
      {
        id: "1",
        name: "Mrs. Abena Kollie",
        email: "abena.kollie@example.com",
        subjects: "Mathematics; English",
      },
    ],
  };
}
