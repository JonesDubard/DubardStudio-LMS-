export interface ParentListItem {
  id: string;
  name: string;
  email: string;
  selected: boolean;
}

export interface LinkedChild {
  id: string;
  name: string;
  meta: string;
  statusLabel: string;
}

export interface ParentSearchResult {
  id: string;
  name: string;
  meta: string;
}

export interface ParentsData {
  schoolName: string;
  portalLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  parentsListTitle: string;
  parentsListDescription: string;
  parents: ParentListItem[];
  selectedParentName: string;
  selectedParentEmail: string;
  linkedChildren: LinkedChild[];
  linkChildTitle: string;
  linkChildDescription: string;
  searchDefault: string;
  searchPlaceholder: string;
  searchResult: ParentSearchResult;
  confirmLabel: string;
}

export function getParents(): ParentsData {
  return {
    schoolName: "Pilot School #1",
    portalLabel: "School Admin",
    eyebrow: "People / Parents",
    title: "Parent-Child Linking",
    subtitle: "Select a parent and link them to one or more students.",
    parentsListTitle: "Parents",
    parentsListDescription: "Select a parent.",
    parents: [
      {
        id: "1",
        name: "Mrs. Agnes Johnson",
        email: "agnes.johnson@example.com",
        selected: true,
      },
      {
        id: "2",
        name: "Mr. Peter Cooper",
        email: "peter.cooper@example.com",
        selected: false,
      },
      {
        id: "3",
        name: "Mrs. Sarah Kromah",
        email: "sarah.kromah@example.com",
        selected: false,
      },
    ],
    selectedParentName: "Mrs. Agnes Johnson",
    selectedParentEmail: "agnes.johnson@example.com",
    linkedChildren: [
      {
        id: "1",
        name: "Amara Johnson",
        meta: "JSS 2A · Student",
        statusLabel: "LINKED",
      },
      {
        id: "2",
        name: "Daniel Johnson",
        meta: "JSS 3A · Student",
        statusLabel: "LINKED",
      },
    ],
    linkChildTitle: "Link Child",
    linkChildDescription: "Search for a student to link to this parent.",
    searchDefault: "Martha",
    searchPlaceholder: "Enter student name or email",
    searchResult: {
      id: "1",
      name: "Martha Johnson",
      meta: "martha.johnson@example.com · JSS 2B",
    },
    confirmLabel: "Confirm Link",
  };
}
