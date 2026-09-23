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