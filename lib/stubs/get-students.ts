export interface StudentRow {
  id: string;
  name: string;
  email: string;
  className: string;
  status: string;
  actionLabel: string;
}

export interface StudentCsvPreviewRow {
  id: string;
  name: string;
  email: string;
  className: string;
}

export interface StudentsList {
  schoolName: string;
  portalLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  countLabel: string;
  breakdownLabel: string;
  bulkImportButtonLabel: string;
  inviteButtonLabel: string;
  students: StudentRow[];
  importTitle: string;
  importDescription: string;
  uploadTitle: string;
  uploadDescription: string;
  uploadButtonLabel: string;
  previewTitle: string;
  csvColumns: { key: string; header: string }[];
  csvRows: StudentCsvPreviewRow[];
  parentLinkTitle: string;
  parentLinkDescription: string;
}

export function getStudents(): StudentsList {
  return {
    schoolName: "Pilot School #1",
    portalLabel: "School Admin",
    eyebrow: "People / Students",
    title: "Students",
    subtitle: "Manage student invitations and class assignments.",
    countLabel: "64 students",
    breakdownLabel: "32 active · 32 invited",
    bulkImportButtonLabel: "Bulk Import CSV",
    inviteButtonLabel: "+ Invite Student",
    students: [
      {
        id: "1",
        name: "Amara Johnson",
        email: "amara.johnson@example.com",
        className: "JSS 2A",
        status: "ACTIVE",
        actionLabel: "Assign Class",
      },
      {
        id: "2",
        name: "David Cooper",
        email: "david.cooper@example.com",
        className: "JSS 2B",
        status: "ACTIVE",
        actionLabel: "Assign Class",
      },
      {
        id: "3",
        name: "Martha Kromah",
        email: "martha.kromah@example.com",
        className: "Not assigned",
        status: "INVITED",
        actionLabel: "Assign Class",
      },
    ],
    importTitle: "Bulk Import Students",
    importDescription: "Upload a CSV containing student information.",
    uploadTitle: "Drop CSV file here",
    uploadDescription: "or choose a file from your computer",
    uploadButtonLabel: "Choose CSV File",
    previewTitle: "CSV Column Preview",
    csvColumns: [
      { key: "name", header: "name" },
      { key: "email", header: "email" },
      { key: "class", header: "class" },
    ],
    csvRows: [
      {
        id: "1",
        name: "Amara Johnson",
        email: "amara.johnson@example.com",
        className: "JSS 2A",
      },
    ],
    parentLinkTitle: "Parent Linking",
    parentLinkDescription:
      "After students are added, use People → Parents to invite parents and link them to one or more students.",
  };
}
