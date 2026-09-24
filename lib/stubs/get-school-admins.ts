export interface SchoolAdminRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  actionLabel: string;
}

export interface SchoolAdminsList {
  schoolName: string;
  portalLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  inviteButtonLabel: string;
  admins: SchoolAdminRow[];
  accessTitle: string;
  accessDescription: string;
}

export function getSchoolAdmins(): SchoolAdminsList {
  return {
    schoolName: "Pilot School #1",
    portalLabel: "School Admin",
    eyebrow: "People / School Admins",
    title: "School Admins",
    subtitle: "Manage administrators who can manage this school.",
    inviteButtonLabel: "+ Invite School Admin",
    admins: [
      {
        id: "1",
        name: "Edith Johnson",
        email: "edith.johnson@example.com",
        role: "School Admin",
        status: "ACTIVE",
        actionLabel: "Remove",
      },
      {
        id: "2",
        name: "Joseph Kollie",
        email: "joseph.kollie@example.com",
        role: "School Admin",
        status: "ACTIVE",
        actionLabel: "Remove",
      },
      {
        id: "3",
        name: "Martha Cooper",
        email: "martha.cooper@example.com",
        role: "School Admin",
        status: "INVITED",
        actionLabel: "Remove",
      },
    ],
    accessTitle: "School Admin Access",
    accessDescription:
      "A school can have multiple admins. Any admin can invite another.",
  };
}
