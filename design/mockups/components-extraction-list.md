| Component name | Screens | Suggested file path |
|---|---|---|
| `BottomNav` | All 4 | `/components/student/BottomNav.tsx` |
| `StudentHeader` | Lesson, Assignment, Submission Status | `/components/student/StudentHeader.tsx` |
| `FeedSection` | Feed | `/components/student/FeedSection.tsx` |
| `LearningCard` | Feed | `/components/student/LearningCard.tsx` |
| `RecentlyViewedRow` | Feed | `/components/student/RecentlyViewedRow.tsx` |
| `StatusBadge` | Feed, Assignment, Submission Status | `/components/student/StatusBadge.tsx` |
| `LessonHeader` | Lesson | `/components/student/LessonHeader.tsx` |
| `LessonContent` | Lesson | `/components/student/LessonContent.tsx` |
| `ProgressiveLoadingSection` | Lesson | `/components/student/ProgressiveLoadingSection.tsx` |
| `MaterialRow` | Lesson, Assignment | `/components/student/MaterialRow.tsx` |
| `OfflineStatus` | Lesson | `/components/student/OfflineStatus.tsx` |
| `AssignmentHeader` | Assignment | `/components/student/AssignmentHeader.tsx` |
| `InstructionsCard` | Assignment | `/components/student/InstructionsCard.tsx` |
| `TextAnswerField` | Assignment | `/components/student/TextAnswerField.tsx` |
| `FileAttachField` | Assignment | `/components/student/FileAttachField.tsx` |
| `PrimaryButton` | All 4 | `/components/student/PrimaryButton.tsx` |
| `SubmissionConfirmation` | Submission Status | `/components/student/SubmissionConfirmation.tsx` |
| `AssignmentSummary` | Submission Status | `/components/student/AssignmentSummary.tsx` |
| `SubmittedWorkCard` | Submission Status | `/components/student/SubmittedWorkCard.tsx` |
| `SubmissionStatusCard` | Submission Status | `/components/student/SubmissionStatusCard.tsx` |


app/
└── student/
    ├── page.tsx
    ├── lessons/
    │   └── [lessonId]/
    │       └── page.tsx
    └── assignments/
        └── [assignmentId]/
            ├── page.tsx
            └── status/
                └── page.tsx

components/
└── student/
    ├── BottomNav.tsx
    ├── StudentHeader.tsx
    ├── LearningCard.tsx
    ├── RecentlyViewedRow.tsx
    ├── LessonContent.tsx
    ├── MaterialRow.tsx
    ├── AssignmentHeader.tsx
    ├── InstructionsCard.tsx
    ├── TextAnswerField.tsx
    ├── FileAttachField.tsx
    ├── SubmissionConfirmation.tsx
    ├── AssignmentSummary.tsx
    ├── SubmittedWorkCard.tsx
    └── SubmissionStatusCard.tsx


    | Component | Screens | Suggested path |
|---|---|---|
| `SideNav` | All 8 | `/components/admin/SideNav.tsx` |
| `AdminHeader` | All 8 | `/components/admin/AdminHeader.tsx` |
| `PrimaryButton` | All 8 | `/components/shared/PrimaryButton.tsx` |
| `SecondaryButton` | All 8 | `/components/shared/SecondaryButton.tsx` |
| `DisabledButton` | Dashboard, Branding, Academic | `/components/shared/DisabledButton.tsx` |
| `StatusBadge` | Dashboard, Teachers, Students, Admins, Assignments | `/components/shared/StatusBadge.tsx` |
| `DataTable` | Teachers, Students, Admins, Assignments, Academic Setup | `/components/shared/DataTable.tsx` |
| `TableHeader` | Teachers, Students, Admins, Assignments, Academic Setup | `/components/shared/TableHeader.tsx` |
| `TableActionButton` | Teachers, Students, Admins, Assignments | `/components/shared/TableActionButton.tsx` |
| `SetupCard` | Academic Setup | `/components/admin/SetupCard.tsx` |
| `SetupProgressCard` | Dashboard | `/components/admin/SetupProgressCard.tsx` |
| `SetupProgressItem` | Dashboard | `/components/admin/SetupProgressItem.tsx` |
| `SummaryTile` | Dashboard | `/components/admin/SummaryTile.tsx` |
| `UsageSummary` | Dashboard | `/components/admin/UsageSummary.tsx` |
| `UploadZone` | Branding, Teachers, Students | `/components/shared/UploadZone.tsx` |
| `FileUploadButton` | Branding, Teachers, Students | `/components/shared/FileUploadButton.tsx` |
| `ColorSwatch` | Branding | `/components/admin/ColorSwatch.tsx` |
| `BrandingPreview` | Branding | `/components/admin/BrandingPreview.tsx` |
| `FormField` | Branding, Academic, Assignments, Parent Linking | `/components/shared/FormField.tsx` |
| `SelectField` | Academic Setup, Assignments | `/components/shared/SelectField.tsx` |
| `FormActions` | Branding, Academic | `/components/shared/FormActions.tsx` |
| `AcademicProgress` | Academic Setup | `/components/admin/AcademicProgress.tsx` |
| `ProgressStep` | Academic Setup | `/components/admin/ProgressStep.tsx` |
| `AcademicYearTable` | Academic Setup | `/components/admin/AcademicYearTable.tsx` |
| `TermsTable` | Academic Setup | `/components/admin/TermsTable.tsx` |
| `ClassesTable` | Academic Setup | `/components/admin/ClassesTable.tsx` |
| `SubjectsTable` | Academic Setup | `/components/admin/SubjectsTable.tsx` |
| `PeopleHeaderActions` | Teachers, Students | `/components/admin/PeopleHeaderActions.tsx` |
| `CsvImportPanel` | Teachers, Students | `/components/admin/CsvImportPanel.tsx` |
| `CsvPreviewTable` | Teachers, Students | `/components/admin/CsvPreviewTable.tsx` |
| `ParentLinkingNote` | Students | `/components/admin/ParentLinkingNote.tsx` |
| `AdminAccessNote` | School Admins | `/components/admin/AdminAccessNote.tsx` |
| `FilterRow` | Assignments | `/components/shared/FilterRow.tsx` |
| `FilterSelect` | Assignments | `/components/shared/FilterSelect.tsx` |
| `ParentList` | Parent Linking | `/components/admin/ParentList.tsx` |
| `ParentListItem` | Parent Linking | `/components/admin/ParentListItem.tsx` |
| `SelectedParentHeader` | Parent Linking | `/components/admin/SelectedParentHeader.tsx` |
| `LinkedChildrenList` | Parent Linking | `/components/admin/LinkedChildrenList.tsx` |
| `StudentSearchField` | Parent Linking | `/components/admin/StudentSearchField.tsx` |
| `LinkChildPanel` | Parent Linking | `/components/admin/LinkChildPanel.tsx` |

components/
├── shared/
│   ├── PrimaryButton.tsx
│   ├── SecondaryButton.tsx
│   ├── DisabledButton.tsx
│   ├── StatusBadge.tsx
│   ├── DataTable.tsx
│   ├── TableHeader.tsx
│   ├── TableActionButton.tsx
│   ├── FormField.tsx
│   ├── SelectField.tsx
│   ├── FormActions.tsx
│   ├── UploadZone.tsx
│   ├── FileUploadButton.tsx
│   └── FilterRow.tsx

components/
└── admin/
    ├── SideNav.tsx
    ├── AdminHeader.tsx
    ├── SetupProgressCard.tsx
    ├── SetupProgressItem.tsx
    ├── SummaryTile.tsx
    ├── UsageSummary.tsx
    ├── BrandingPreview.tsx
    ├── ColorSwatch.tsx
    ├── AcademicProgress.tsx
    ├── ProgressStep.tsx
    ├── SetupCard.tsx
    ├── AcademicYearTable.tsx
    ├── TermsTable.tsx
    ├── ClassesTable.tsx
    ├── SubjectsTable.tsx
    ├── PeopleHeaderActions.tsx
    ├── CsvImportPanel.tsx
    ├── CsvPreviewTable.tsx
    ├── ParentLinkingNote.tsx
    ├── AdminAccessNote.tsx
    ├── ParentList.tsx
    ├── ParentListItem.tsx
    ├── SelectedParentHeader.tsx
    ├── LinkedChildrenList.tsx
    ├── StudentSearchField.tsx
    └── LinkChildPanel.tsx