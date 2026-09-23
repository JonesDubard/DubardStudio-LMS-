Dubardstudio white-label LMS - MVP product & tech review
Table of contents
1. Vision & pilot context
2. Success metrics
3. Out of scope (explicitly deferred)
4. Personas
5. Information architecture
6. Wireframe flows
7. MVP feature priority
8. Tech stack (+ architecture guardrails)
9. Developer workflow
10. Branding & GTM
11. Name shortlist
12. Open questions & decisions
13. Next actions
Appendix: Mermaid diagrams
Editor's notes

1. Vision & pilot context
(This section defines the overarching vision and operational context for the Liberian school pilot. Content pending formal review.)
2. Success metrics
(This section details key performance indicators and target metrics for pilot validation. Content pending formal review.)
3. Out of scope (explicitly deferred)
(This section explicitly lists feature sets deferred past the initial MVP release. Content pending formal review.)
4. Personas
4.1 Platform admin
Primary objective Provision schools, control tenant access and subscriptions, monitor onboarding, and perform authorized cross-tenant administration.
The PRD defines Platform Admin responsibilities as tenant provisioning, platform health and usage monitoring, and subscription control.
Information architecture
Platform Admin Console
├── Dashboard
│   ├── Total Tenants
│   ├── Active Tenants
│   ├── Trial Tenants
│   ├── Suspended Tenants
│   └── Onboarding Status
├── Tenants
│   ├── All Tenants
│   ├── Create Tenant
│   └── Tenant Details
│       ├── School Information
│       ├── Subdomain
│       ├── Subscription
│       ├── Onboarding Status
│       ├── Usage
│       └── Authorized Access
├── Subscriptions
│   ├── Trial
│   ├── Active
│   ├── Suspended
│   └── Cancelled
├── Platform Usage [P1]
│   ├── Users
│   ├── Storage
│   └── Activity
└── Audit
    ├── Cross-Tenant Access
    ├── Administrative Actions
    └── Access Details


Important boundary Platform Admin is not simply another tenant administrator. Normal users operate strictly within a single tenant. Platform Admin has a separate elevated path for cross-tenant operations, and those operations must be fully audited.
4.2 School administrator
The School Admin's information architecture answers four operational questions:
Is the school configured?
Are the users onboarded?
Is the academic structure ready?
Is learning activity happening?
Information architecture
School Admin
├── Dashboard
│   ├── Setup Progress
│   ├── Teachers
│   ├── Students
│   ├── School Admins
│   ├── Published Lessons
│   ├── Assignments
│   └── Basic Usage
├── School Setup
│   ├── School Information
│   └── Branding
│       ├── School Logo
│       ├── Header Logo
│       ├── Favicon
│       ├── Primary Color
│       └── Secondary Color
├── Academic Setup
│   ├── Academic Years
│   ├── Terms
│   ├── Classes / Grade Levels
│   └── Subjects
├── People
│   ├── School Admins
│   │   ├── View
│   │   ├── Invite
│   │   └── Remove
│   ├── Teachers
│   │   ├── View
│   │   ├── Invite
│   │   ├── Bulk Invite
│   │   └── Assign Classes / Subjects
│   ├── Students
│   │   ├── View
│   │   ├── Invite
│   │   ├── CSV Import
│   │   └── Assign Classes
│   └── Parents
│       ├── View
│       ├── Invite
│       └── Link Children
├── Academic Content
│   ├── Courses
│   ├── Lessons
│   └── Assignments
└── Usage Overview [P1]
    ├── Login Activity
    ├── Lessons Published
    └── Submission Activity


The PRD specifically calls for branding, academic structure, teacher/student/parent management, and simple usage monitoring.
4.3 Teacher
Teacher navigation is content-first, not administration-first.
Information architecture
Teacher
├── Home
│   ├── My Classes
│   ├── Recent Lessons
│   ├── Pending Grading
│   └── Upcoming Assignments
├── My Classes
│   └── Class
│       ├── Students
│       ├── Subjects
│       └── Courses
├── My Lessons
│   ├── All Lessons
│   ├── Drafts
│   ├── Published
│   └── Reusable
├── Create Lesson
│   ├── Select Class
│   ├── Select Subject
│   ├── Select Term
│   ├── Title
│   ├── Description
│   ├── Materials (PDF, Document, Image)
│   ├── External Video
│   └── Publish
├── Assignments
│   ├── All Assignments
│   ├── Create Assignment
│   ├── Upcoming
│   └── Past
├── Submissions
│   ├── Assignment
│   ├── Student List
│   ├── Submission
│   ├── Grade
│   └── Feedback
└── Reuse
    ├── Duplicate Lesson
    ├── Duplicate Unit
    └── Carry Forward


These functions map directly to the teacher MVP feature set, including lesson creation, organization, duplication, assignment creation, grading, and feedback.
4.4 Student
Student information architecture is kept intentionally simple.
Information architecture
Student
├── Home
│   └── Learning Feed
│       ├── New Lessons
│       ├── Assignments
│       ├── Due Soon
│       └── Recently Viewed
├── Classes
│   └── Class
│       └── Subjects
├── Subjects
│   └── Subject
│       └── Courses
├── Lessons
│   └── Lesson
│       ├── Content
│       ├── Materials
│       ├── Video Link
│       └── Download
├── Assignments
│   └── Assignment
│       ├── Instructions
│       ├── Due Date
│       ├── Materials
│       ├── Submit
│       └── Status
├── Grades
│   └── Grade
│       ├── Score
│       └── Teacher Feedback
└── Offline
    └── Recently Viewed Lessons


The PRD prioritizes a chronological or subject-organized feed, low-bandwidth lesson access, assignment submission, and grades/feedback.
Mobile navigation layout recommendation
┌──────────────────────────┐
│ School Logo              │
│                          │
│ Main Content             │
│                          │
│                          │
├──────────────────────────┤
│ Home │ Classes │ Grades │
└──────────────────────────┘


Decision: Keep Assignments as a dedicated tab only if testing shows students need a persistent assignment-focused destination. Otherwise, use a prominent due/assignment badge on Home to preserve the simpler three-item mobile navigation.
4.5 Parent
Parent navigation is monitoring-oriented.
Information architecture
Parent
├── Home
│   ├── Child Selector
│   ├── Upcoming Work
│   ├── Overdue Work
│   └── Recent Grades
├── Children
│   ├── Child 1
│   ├── Child 2
│   └── Add/Link Child
├── Child Overview
│   ├── Classes
│   ├── Subjects
│   ├── Lesson Activity
│   ├── Upcoming Assignments
│   ├── Overdue Assignments
│   └── Grades
├── Grades
│   └── Child Grades
└── Notifications
    └── Weekly/Periodic Digest
        ├── Assignment Reminders
        └── Progress Summary


The parent role is explicitly read-only and strictly scoped to linked children.
4.6 Recommended global navigation model
Navigation is customized per persona rather than uniform across the platform:
Platform Admin: Dashboard | Tenants | Subscriptions | Usage | Audit
School Admin: Dashboard | Setup | People | Academic | Content | Usage
Teacher: Home | Classes | Lessons | Assignments | Grading
Student: Home | Classes | Grades | Profile
Parent: Home | Children | Assignments | Grades | Profile
This differentiation supports the PRD's central UX principle of simplicity and minimal training. Forcing every persona into identical information structures degrades usability. The PRD explicitly requires core workflows to be achievable within 3–4 taps or clicks from login.
5. Information architecture
5.1 Global product structure
WHITE-LABEL LMS
│
├── Authentication
│   ├── Login
│   ├── Accept Invitation
│   ├── Set Password
│   ├── Password Reset
│   └── Session / Logout
│
├── Platform Layer
│   ├── Platform Admin
│   ├── Tenant Management
│   ├── Subscription Management
│   ├── Platform Usage
│   └── Audit
│
└── Tenant Layer
    │
    ├── School Admin
    │   ├── Dashboard
    │   ├── School Branding
    │   ├── Academic Setup
    │   ├── People
    │   ├── Courses
    │   ├── Lessons
    │   ├── Assignments
    │   └── Usage Overview
    │
    ├── Teacher
    │   ├── Dashboard
    │   ├── Classes
    │   ├── Subjects
    │   ├── Courses
    │   ├── Lessons
    │   ├── Assignments
    │   ├── Submissions
    │   ├── Grades & Feedback
    │   └── Reusable Content
    │
    ├── Student
    │   ├── Home / Learning Feed
    │   ├── Classes
    │   ├── Subjects
    │   ├── Courses
    │   ├── Lessons
    │   ├── Assignments
    │   ├── Submission
    │   ├── Grades & Feedback
    │   └── Offline Content
    │
    └── Parent
        ├── Home
        ├── Children
        ├── Child Overview
        ├── Assignments
        ├── Grades
        ├── Lesson Activity
        └── Digest / Notifications


5.2 MVP screen hierarchy
The MVP structured across three primary application surfaces:
                WHITE-LABEL LMS
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
 PLATFORM          TENANT           AUTH
 CONSOLE           APP              LAYER
        │              │
        │       ┌──────┼───────┐
        │       │      │       │
        ▼       ▼      ▼       ▼
      Admin   School Teacher Student Parent
               Admin


Inside the tenant application:
                   TENANT
                      │
          ┌───────────┴───────────┐
          │                       │
       SETUP                  ACADEMIC
          │                       │
   ┌──────┼──────┐        ┌───────┼────────┐
   │      │      │        │       │        │
Branding Users Academic  Courses Lessons Assignments
                Setup
                                      │
                                      ▼
                                  Submissions
                                      │
                                      ▼
                                  Grades
                                      │
                                      ▼
                               Student / Parent


This model provides a clear developer architecture:
Tenant → Academic Structure → Content → Assessment → Outcomes
The platform layer separately governs:
Tenant → Subscription → Access → Audit
5.3 P0 MVP boundary
See also: Section 7 for the feature priority view of this.
The essential P0 execution loop required for the pilot includes:
Platform: Create tenant → invite School Admin → control subscription → audit elevated access.
School Admin: Brand school → configure academic structure → manage School Admins → invite users → assign users → monitor assignments and activity.
Teacher: Select class → create lesson → publish → create assignment → receive submission → grade → provide feedback → reuse content.
Student: Login → view feed → open lesson → download or view material → submit assignment → review grade and feedback.
Parent: Login → select child → review upcoming or overdue work → review grades.
This aligns directly with PRD §4.2 and P0 feature tables.
5.4 P1 / P2 boundary
See also: Section 7 for the feature priority view of this.
P1 boundary
Platform: Usage dashboard.
School Admin: Usage overview, lessons overview, assignments overview, student submission and grade views.
Teacher: Reusable content library.
Student: Offline-friendly Progressive Web App (PWA) caching, recently viewed lessons.
Parent: Weekly or periodic digest.
P2 boundary
Platform: Self-service tenant signup, automated billing and invoicing.
School Admin: Custom domain configuration.
Teacher: Co-teacher and shared classes.
Student: Push and SMS notifications.
Parent: Direct teacher messaging.
This scope preserves the priority classifications established in the PRD without expanding the MVP.
5.5 Final implementation principle
The primary UX directive is that the system must operate like five small applications sharing a unified academic data model, rather than a single monolithic LMS with five permission levels.
Underlying data hierarchy
TENANT
  └── ACADEMIC YEAR
        └── TERM
              └── CLASS
                    └── SUBJECT
                          └── COURSE
                                └── LESSON
                                      └── ASSIGNMENT
                                            └── SUBMISSION
                                                  └── GRADE + FEEDBACK


Users attach directly to corresponding tenant, class, and subject relationships. This structure aligns with source MVP academic entities while preserving PRD requirements for complete multi-tenant isolation.
6. Wireframe flows
6.1 Platform admin - tenant provisioning
[Platform Login] ──► [Platform Dashboard] ──► [Tenants] ──► [+ Create Tenant]
                                                                  │
                                                                  ▼
                                                      ┌──────────────────────┐
                                                      │ School Information   │
                                                      │                      │
                                                      │ School Name          │
                                                      │ Contact Person       │
                                                      │ Contact Email        │
                                                      │ Subdomain            │
                                                      └──────────┬───────────┘
                                                                 │
                                                                 ▼
                                                          [Review Tenant]
                                                                 │
                                                                 ▼
                                                          [Create Tenant]
                                                                 │
                                                                 ▼
                                                      ┌──────────────────────────┐
                                                      │ System Execution         │
                                                      │ - Creates tenant         │
                                                      │ - Creates default brand  │
                                                      │ - Creates settings       │
                                                      │ - Generates Admin invite │
                                                      └──────────┬───────────────┘
                                                                 │
                                                                 ▼
                                                           [Tenant Detail]
                                                                 │
                                                     ┌───────────┼───────────┐
                                                     ▼           ▼           ▼
                                                 [Status]     [Setup]     [Usage]


Automatic default branding, School Admin invitation generation, and default settings align with PRD §2.2.2 requirements.
6.2 Platform admin - subscription control
[Tenants] ──► [Tenant Detail] ──► [Subscription]
                                         │
                                         ▼
                             ┌────────────────────┐
                             │ Current Status     │
                             │ ○ Trial            │
                             │ ○ Active           │
                             │ ○ Suspended        │
                             │ ○ Cancelled        │
                             └─────────┬──────────┘
                                       │
                                       ▼
                                [Change Status] ──► [Confirm Action] ──► [Audit Event Created] ──► [Updated Tenant]


Subscription status gates system access at the authentication layer.
6.3 Platform admin - audit
[Platform Console] ──► [Audit]
                         │
                         ▼
             ┌──────────────────────────────┐
             │ Audit Log                    │
             ├──────────────────────────────┤
             │ Date                         │
             │ Admin                        │
             │ Tenant                       │
             │ Action                       │
             │ Resource                     │
             │ Result                       │
             └──────────────┬───────────────┘
                            │
                            ▼
                     [Audit Detail] ──► [Access Context]


Cross-tenant Platform Admin access is fully audit-logged under NFR-6.5.4.
6.4 School admin - branding
[Accept Invitation] ──► [Set Password] ──► [School Setup Wizard] ──► [Branding]
                                                                           │
                                                    ┌──────────────────────┼──────────────────────┐
                                                    ▼                      ▼                      ▼
                                              [Upload Logo]         [Primary Color]        [Secondary Color]
                                                                           │
                                                                           ▼
                                                                       [Favicon]
                                                                           │
                                                                           ▼
                                                                       [Preview] ──► [Save / Skip] ──► [Academic Setup]


The branding wizard is guided, skippable, and revisitable per PRD §2.3 requirements.
6.5 School admin - academic setup
[Academic Setup] ──► [Academic Year] ──► [Terms] ──► [Classes] ──► [Subjects]
                                                                       │
                                                                       ▼
                                                             [Assign Teachers] ──► [Assign Students] ──► [Academic Structure Ready]


6.6 School admin - invitations
[Users]
   │
   ├──────────────────────────────┐
   ▼                              ▼
[Teachers]                    [Students]
   │                              │
   ▼                              ▼
[Invite]                      [CSV Import]
   │                              │
   ▼                              ▼
[Email]                       [Validate]
   │                              │
   ▼                              ▼
[Invitation]                  [Import]
   │                              │
   └──────────────┬───────────────┘
                  ▼
            [Users Active]


Parent onboarding follow-up flow:
[Parents] ──► [Invite / Import] ──► [Link Parent] ──► [Select Student(s)] ──► [Confirm]


6.7 School admin - manage school admins
[School Admin Dashboard] ──► [People] ──► [School Admins]
                                                │
                                                ▼
                                    ┌─────────────────────────────┐
                                    │ Manage School Admins        │
                                    ├─────────────────────────────┤
                                    │ Admin Name                  │
                                    │ Email                       │
                                    │ Status                      │
                                    │                             │
                                    │ [+ Invite School Admin]     │
                                    └──────────────┬──────────────┘
                                                   │
                                ┌──────────────────┴──────────────────┐
                                ▼                                     ▼
                          [Invite Admin]                        [Select Admin]
                                │                                     │
                                ▼                                     ▼
                          [Email Address]                      [Admin Details]
                                │                                     │
                                ▼                                     ▼
                          [Send Invite]                        [Remove Admin]
                                │                                     │
                                ▼                                     ▼
                          [Invite Sent]                        [Confirm Removal] ──► [Admin Removed]


Open question: Can the last remaining School Admin remove themselves or lock the tenant out? This must be resolved before implementing admin removal rules.
6.8 School admin - assignments overview
[School Dashboard] ──► [Assignments]
                             │
                             ▼
                 ┌─────────────────────────────┐
                 │ Assignment Overview         │
                 ├─────────────────────────────┤
                 │ Assignment                  │
                 │ Teacher                     │
                 │ Class                       │
                 │ Due Date                    │
                 │ Submissions                 │
                 │ Graded                      │
                 └──────────────┬──────────────┘
                                │
                                ▼
                         [Assignment Detail] ──► [Submission Overview]


6.9 Teacher - lesson creation
[Teacher Home] ──► [My Classes] ──► [Select Class] ──► [Select Subject/Course] ──► [Lessons] ──► [+ Create Lesson]
                                                                                                         │
                                                                                                         ▼
                                                                                             ┌───────────────────────────────┐
                                                                                             │ Lesson Editor                 │
                                                                                             │ Title                         │
                                                                                             │ Description                   │
                                                                                             │ Materials (PDF/Doc/Image)     │
                                                                                             │ External Video Link           │
                                                                                             └───────────────┬───────────────┘
                                                                                                             │
                                                                                                             ▼
                                                                                                       [Save Draft] ──► [Preview] ──► [Publish] ──► [Student Feed]


The MVP supports PDF, document, and image attachments alongside external video links, deferring direct video uploads.
6.10 Teacher - assignment creation
[Lesson] ──► [+ Add Assignment]
                    │
                    ▼
        ┌─────────────────────────┐
        │ Assignment              │
        │ Title                   │
        │ Instructions            │
        │ Due Date                │
        │ Materials               │
        └───────────┬─────────────┘
                    │
                    ▼
               [Preview] ──► [Publish] ──► [Student Assignment]


6.11 Teacher - grading
[Teacher Home] ──► [Pending Grading] ──► [Assignment] ──► [Submission List] ──► [Student Submission]
                                                                                      │
                                                                                      ▼
                                                                          ┌─────────────────────────┐
                                                                          │ Submission              │
                                                                          │ Student                 │
                                                                          │ Submitted Work          │
                                                                          │ Grade: [____]           │
                                                                          │ Feedback: [________]    │
                                                                          └───────────┬─────────────┘
                                                                                      │
                                                                                      ▼
                                                                                 [Release] ──► [Student Grades]


6.12 Teacher - lesson reuse
[My Lessons] ──► [Lesson] ──► [More] ──► [Duplicate / Carry Forward] ──► [Select New Term/Year] ──► [Review] ──► [Create Copy] ──► [New Draft] ──► [Publish]


Lesson and unit duplication across terms is a core P0 capability mandated by PRD §4.3.
6.13 Student - mobile learning feed
[Login] ──► [Student Home]
                 │
                 ▼
     ┌──────────────────────────┐
     │ TODAY                    │
     │ New Lesson: Math         │
     │ Assignment Due: English  │
     │ Recently Viewed          │
     └────────────┬─────────────┘
                  │
                  ▼
            [Open Content]


The feed provides a simplified work queue prioritizing chronological and subject-organized items.
6.14 Student - lesson viewing
[Feed] ──► [Lesson]
              │
              ▼
  ┌──────────────────────┐
  │ LESSON TITLE         │
  │ Text / Description   │
  │ [Download PDF]       │
  │ [View Image]         │
  │ [Watch Video ↗]      │
  └──────────┬───────────┘
             │
             ▼
      [Recently Viewed] ──► [Offline Cache]


Progressive loading order: Text → Structure → Compressed Images → Heavy Attachments On-Demand.
6.15 Student - assignment submission
[Student Feed] ──► [Assignment]
                          │
                          ▼
              ┌────────────────────────┐
              │ Instructions           │
              │ Due: Date/Time         │
              │ [Write Answer]         │
              │ [Attach File]          │
              └───────────┬────────────┘
                          │
                          ▼
                     [Submit Work] ──► [Confirmation] ──► [Submission Status]


6.16 Student - grades
[Home] ──► [Grades] ──► [Subject] ──► [Assignment]
                                           │
                                           ▼
                               ┌────────────────────────┐
                               │ Grade                  │
                               │ Score                  │
                               │ Teacher Feedback       │
                               └────────────────────────┘


6.17 Student - offline access
[Online] ──► [Student Views Lesson] ──► [Cache Recent Lesson]
                                               │
                                               ▼
                                      [Connection Lost]
                                               │
                                               ▼
                                    [Open Recently Viewed]
                                               │
                                               ▼
                                        [Cached Lesson]
                                               │
                                               ▼
                                     [Connection Restored] ──► [Refresh / Sync]


MVP offline capability is restricted to recently viewed lesson caching rather than full offline LMS operation.
6.18 Parent - linked children
[Parent Login] ──► [Parent Home]
                        │
                        ▼
            ┌──────────────────────┐
            │ CHILDREN             │
            │ ○ Child A            │
            │ ○ Child B            │
            └──────────┬───────────┘
                       │
                       ▼
                [Select Child] ──► [Child Overview]


6.19 Parent - upcoming / overdue work
[Child Overview] ──► [Assignments]
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
       [Upcoming]                   [Overdue]
            │                           │
            ▼                           ▼
      Assignment A                Assignment B


6.20 Parent - grades
[Child Overview] ──► [Grades] ──► [Subject] ──► [Assignment] ──► [Grade + Feedback]


6.21 Parent - digest
[System] ──► [Periodic Digest] ──► [Child Activity / Reminders / Grades] ──► [Email / SMS]


Periodic digests are categorized as P1. Preferred communication channels remain an open product question.
6.22 Diagram - core academic loop
[Diagram: Core academic loop] — see Appendix for rendered image. Alt text: Flowchart illustrating the relationship from course, lesson, and assignment to student submission, grading, feedback, and student/parent view.
6.23 Diagram - onboarding loop
[Diagram: Onboarding loop] — see Appendix for rendered image. Alt text: Flowchart connecting platform administration and tenant provisioning to school setup wizard, academic structure creation, user invitations, and initial lesson publishing.
6.24 Diagram - school setup loop
[Diagram: School setup loop] — see Appendix for rendered image. Alt text: Flowchart detailing sequential steps from school admin invitation acceptance through branding, academic structure, user assignment, content creation, and final school readiness.
6.25 Diagram - teaching loop
[Diagram: Teaching loop] — see Appendix for rendered image. Alt text: Flowchart showing teacher workflow from login and class selection to lesson creation, assignment distribution, submission grading, student feedback, and term-to-term lesson reuse.
7. MVP feature priority
See also: Section 5 for the information architecture view of this.
7.1 Authentication & shared screens

Screen
Persona
Priority
Purpose
Login
All
P0
Authenticate user
Accept Invitation
All
P0
Activate invited account
Set Password
All
P0
Complete activation
Forgot Password
All
P0
Recover access
Profile
All
P0
Basic profile management
Logout
All
P0
End session
Unbranded / Default Theme Fallback
System
P0
Ensure tenants without configured branding render a valid default theme

7.2 Platform admin screens

Screen
Priority
Purpose
Platform Dashboard
P1
Platform overview
Tenant List
P0
View and manage schools
Create Tenant
P0
Provision school
Tenant Details
P0
View and edit tenant details
Subscription Control
P0
Manage trial, active, suspended, or cancelled states
Onboarding Status
P0
Monitor setup progress
Platform Usage
P1
Monitor usage metrics
Cross-Tenant Access
P0
Authorized administrative access
Audit Log
P0
Record elevated access events
Self-Service Signup
P2
Prospect self-onboarding
Billing / Invoices
P2
Automated billing management

7.3 School admin screens

Screen
Priority
Purpose
School Dashboard
P0
School overview
Setup Wizard
P0
Guide initial configuration
School Information
P0
Manage school metadata
Branding
P0
Logo, colors, and favicon configuration
Academic Years
P0
Manage academic years
Terms
P0
Manage terms
Classes
P0
Manage classes and grade levels
Subjects
P0
Manage subjects
Manage School Admins
P0
Invite or remove additional School Admins
Teacher List
P0
Manage teachers
Invite Teacher
P0
Invite individual teacher
Bulk Teacher Import
P0
Bulk teacher onboarding
Student List
P0
Manage students
Bulk Student Import
P0
Bulk student onboarding
Parent List
P0
Manage parents
Parent-Child Linking
P0
Link parents to students
Teacher/Class/Subject Assignment
P0
Assign academic responsibilities
Courses
P0
Manage courses
Lessons Overview
P1
View lessons across the school
Assignments Overview
P1
View assignments across the school
Student Submission/Grade View
P1
View student submissions and grades
Usage Overview
P1
Monitor school usage
Custom Domain
P2
Configure CNAME or custom domain

Note: Lessons Overview, Assignments Overview, and Student Submission/Grade View are classified as P1 for administrative IA. They are distinct from the core P0 setup and management tools defined in PRD §4.2.
7.4 Teacher screens

Screen
Priority
Teacher Dashboard
P0
My Classes
P0
Class Detail
P0
Subject / Course View
P0
Lesson List
P0
Create Lesson
P0
Edit Lesson
P0
Lesson Preview
P0
Publish / Unpublish
P0
Lesson Materials
P0
Assignment List
P0
Create Assignment
P0
Assignment Detail
P0
Submission List
P0
Submission Detail
P0
Grade Submission
P0
Feedback
P0
Reuse / Duplicate Lesson
P0
Reusable Content Library
P1
Co-Teacher Management
P2

7.5 Student screens

Screen
Priority
Student Login
P0
Student Home / Feed
P0
Class View
P0
Subject View
P0
Course View
P0
Lesson View
P0
Material Viewer / Download
P0
Assignment View
P0
Assignment Submission
P0
Submission Status
P0
Grades
P0
Feedback
P0
Recently Viewed / Offline Lessons
P1
PWA Install Experience
P1
Push / SMS Notifications
P2

7.6 Parent screens

Screen
Priority
Parent Login
P0
Parent Home
P0
Child Selector
P0
Child Overview
P0
Upcoming Assignments
P0
Overdue Assignments
P0
Grades
P0
Teacher Feedback
P0
Lesson Activity
P0
Link Child
P0
Weekly / Periodic Digest
P1
Teacher Messaging
P2

8. Tech stack (+ architecture guardrails)

Layer
Choice
Why it maps to PRD
Status
Owner
Notes
Frontend framework + rendering
Next.js App Router + TypeScript; React Server Components (RSC) default, Client Components only when state requires.
Supports minimalist UX, low payloads (NFR-6.1.1), mobile views (NFR-6.2.1), 3–4 tap workflows (NFR-6.3.1), and tenant resolution (FR-2.3.2–2.3.5).
Decided
Frontend
Hard constraint. Do not replace with Vite/CRA. Server-render read-heavy feeds and lesson views where practical.
UI styling + design tokens
Tailwind CSS + CSS custom properties for tenant branding.
FR-2.3.2 requires color propagation via CSS custom properties without code changes. NFR-6.3.3 requires accessible UI.
Decided
Frontend
Tailwind handles structural styling; tenant values resolve via semantic variables (e.g., --brand-primary).
Form handling + validation
React Hook Form + Zod.
Simplifies P0 workflows (NFR-6.3.1) and enforces upload validation (NFR-6.5.5).
Decided
Frontend
Share Zod schemas between client and server. Do not rely solely on client validation.
Client data fetching + cache
Native Next.js server fetching/RSC for reads; TanStack Query for interactive mutations/cache.
NFR-6.1.1 and NFR-6.1.6 require efficient payloads and pagination. NFR-6.3.1 avoids client waterfalls.
Decided
Frontend
Avoid placing the full application behind client query layers. Use client caching for offline support or mutations.
PWA + offline storage
Serwist + Dexie / IndexedDB.
NFR-6.1.5 requires installable PWA with offline caching of recent lessons (P1).
Decided
Frontend
Service worker handles caching strategy; Dexie manages structured lesson storage. Workbox alone is insufficient.
Image handling
next/image + Supabase Storage image transformations.
FR-2.3.1 requires logo validation; NFR-6.1.2 mandates compressed responsive images.
Decided
Frontend + Backend
Supabase transformations require Pro plan; if on Free during pilot, next/image on Vercel handles optimization.
Backend / API
Supabase Edge Functions + Next.js server actions / route handlers.
FR-2.2.1–2.2.4 govern provisioning and auth; NFR-6.5.1 mandates server RBAC; NFR-6.6.2 encourages queuing non-critical work.
Decided
Backend
Supabase provides Postgres, Auth, Storage, and RLS. Use Edge Functions for external webhooks and isolated operations.
Database migration tooling
Supabase CLI migrations.
NFR-6.4.2 mandates tenant-safety migration reviews. Keeps schema and RLS policies version-controlled.
Decided
Backend
Prefer direct SQL/Supabase migrations over Prisma/Drizzle authority. Migration PRs require explicit RLS review.
Database isolation (RLS)
Supabase PostgreSQL, shared schema, mandatory tenant_id + RLS on every tenant table.
Hard requirement in §2.1 and NFR-6.4.1. NFR-6.4.3 mandates isolation tests.
Decided
Backend
Non-negotiable. Application filtering is not tenant isolation. Every query must be protected by database RLS.
tenant_id → JWT injection
Supabase Auth JWT custom claim containing tenant_id; RLS reads authenticated JWT claim.
§2.1 requires sessions to resolve to one tenant_id via auth.jwt(). NFR-6.4.1 mandates RLS enforcement.
Spike needed
Backend
Highest-risk technical unknown. Must validate: login → tenant claim → auth.jwt() → RLS policy enforcement.
File storage isolation
Supabase Storage, tenant-prefixed paths + Storage RLS policies.
§2.4 requires tenant file partitioning mirroring database RLS. NFR-6.4.4 and NFR-6.5.5 mandate upload scanning.
Decided
Backend
Required path pattern: /{tenant_id}/{resource_type}/{resource_id}/{file}. Never authorize files via client-supplied paths.
Auth + RBAC claims
Supabase Auth + JWT role/tenant claims; server-side RBAC.
NFR-6.5.1 mandates secure authentication and server RBAC. NFR-6.5.3 requires read-only parent access scoped to linked children.
Decided
Backend
Role claims must be server-controlled. Tenant membership and role checks must execute server-side.
Tenant provisioning automation
Transactional provisioning workflow with explicit state + retryable steps.
FR-2.2.1 targets tenant creation under 5 mins. FR-2.2.2 requires default branding/invites. NFR-6.6.2 mandates graceful degradation.
Spike needed
Backend
Do not treat provisioning as a single synchronous request. Use idempotent steps, record failures, and retry safely.
Subdomain routing
Vercel wildcard domain + Next.js Middleware hostname resolution.
FR-2.3.4 requires unique tenant subdomains at MVP. FR-2.2.1 governs subdomain provisioning.
Decided
Frontend + Platform
Example: school.ourlms.com → middleware extracts hostname → resolves tenant context.
Custom domain provisioning
Vercel custom domain management: CNAME → Vercel → automatic SSL.
FR-2.3.4 defines custom domains as fast-follow via CNAME. NFR-6.6.1 requires zero-infrastructure redesign.
Open
Frontend + Platform
Retain custom_domain field in schema from day one. Functionality remains fast-follow.
Branding token delivery
Server-side inline CSS variables in HTML shell.
FR-2.3.2 requires CSS variables; FR-2.3.3 mandates instant application; FR-2.3.5 mandates default fallback.
Decided
Frontend
Hard architectural constraint. Tenant resolution and branding lookup must occur prior to rendering the HTML shell.
Background jobs
Supabase Edge Functions for short tasks; Postgres queue (pgmq) / worker for bulk operations.
NFR-6.6.2 requires queuing non-critical tasks. Bulk CSV imports (P0) require background processing under §4.2.
Spike needed
Backend
Edge Functions validate uploads; durable bulk processing uses chunked queue jobs with retry tracking.
Bulk CSV invites execution
Queue / worker architecture rather than single synchronous function.
Bulk teacher/student invites are P0 under §4.2; NFR-6.6.2 requires queuing under load.
Decided
Backend
Parse and validate uploads via Edge Function, then process invitations in background queues.
Email provider
Resend.
FR-2.2.2 requires automated admin invites; §4.5 mandates parent digest delivery (P1).
Decided
Backend
Use transactional email for invites, resets, and digests via an abstract email service interface.
SMS provider
Termii vs Twilio evaluation via pilot spike.
Parent digest (P1) and push/SMS notifications (P2). Preferred communication channel remains open in PRD.
Spike needed
Backend + Product
Evaluate Termii (regional delivery) vs Twilio (Liberia support documented) for cost, latency, and delivery rates.
Unit testing
Vitest + React Testing Library.
Covers P0 lesson creation, assignments, grading, and setup workflows per NFR-6.3.1.
Decided
Frontend + Backend
Focus on testing business logic, validation schemas, tenant resolution, and permission rules.
End-to-end testing
Playwright.
NFR-6.3.1 mandates core workflows within 3–4 interactions; NFR-6.4.3 requires automated CI tests.
Decided
Frontend
Cover all five persona workflows: provisioning, school setup, teaching, submission, and parent monitoring.
RLS isolation testing
Dedicated PostgreSQL/Supabase integration tests evaluating multi-tenant boundaries.
NFR-6.4.1 mandates RLS; NFR-6.4.3 requires automated cross-tenant isolation testing in CI.
Decided
Backend
Release blocker. Test SELECT, INSERT, UPDATE, DELETE, and Storage paths against malicious cross-tenant attempts.
Low-bandwidth performance testing
Playwright + Chromium network throttling + Web Vitals analysis.
NFR-6.1.1 targets <3s LCP on throttled 3G; NFR-6.1.2–6.1.3 mandate optimized loading.
Decided
Frontend
Test low-cost Android viewport profiles over ~400 Kbps / 400ms RTT network conditions.
CI / CD
GitHub Actions → Vercel deployment + Supabase migrations with tenant-safety gate.
NFR-6.4.2 mandates migration safety reviews; NFR-6.4.3 requires isolation tests prior to release. See also: Section 9 for developer workflow view.
Decided
All
Mandatory pipeline: migration review → tenant_id check → RLS policy test → app tests → preview deploy.
Audit log implementation
Append-only PostgreSQL audit table + dedicated elevated access path.
NFR-6.5.4 mandates Platform Admin cross-tenant auditing via dedicated paths.
Decided
Backend
Record actor ID, tenant ID, action, resource, timestamp, and result. Restrict table modifications to elevated service functions.
Monitoring + error tracking
Sentry + Vercel / Supabase native logging.
NFR-6.6.3 requires 99.5% uptime during school hours; NFR-6.6.2 mandates graceful degradation.
Decided
Backend + Frontend
Sentry handles application exceptions; Vercel and Supabase provide infrastructure logs.
Low-bandwidth telemetry
Lightweight Web Vitals + custom tenant-aware performance events.
NFR-6.1.1 defines performance targets; NFR-6.1.6 requires payload optimization.
Open
Frontend
Sample LCP, INP, CLS, payload sizes, and network types without collecting student PII.
Hosting / CDN
Vercel.
NFR-6.1.1 requires low latency; NFR-6.6.1 mandates scaling from 1 to 50+ tenants without redesign.
Decided
Platform
Hard constraint. Next.js App Router and RSC depend on Vercel deployment infrastructure.
Rate limiting / abuse protection
Supabase Edge gateway limits + application-level IP / user throttling.
NFR-6.5.1–6.5.5 establish security baseline; NFR-6.6.2 requires stability under load.
Decided (baseline)
Backend
Enforce strict limits on auth, password reset, invite, import, and file upload endpoints.

9. Developer workflow
9.1 Tooling inventory

Need
Tool
Purpose
Why for this project
Source control
GitHub
Repository, branching, PRs, and code history.
Central source of truth supporting pair-programming and review workflows.
Project tracking
GitHub Projects
Lightweight backlog and task tracking.
Keeps task management tightly integrated with repository code.
Documentation
Google Docs
Living product and technical documentation.
Accessible to both technical team members and pilot school stakeholders.
Design & wireframes
Figma
Interface layouts, wireframes, and prototypes.
Provides shared visual specifications for frontend pair-programmers.
Process diagrams
Mermaid
Architecture and sequence flow diagrams.
Enables version-controlled text-based diagramming alongside documentation.
Asynchronous communication
GitHub Discussions / PR comments
Decision tracking and technical context retention.
Preserves technical context directly alongside code changes.
Synchronous communication
WhatsApp
Fast team coordination.
Practical real-time channel for team operations in Liberia.
API testing
Postman
API request validation and collection sharing.
Facilitates API contract testing between frontend and backend developers.
API contract typing
Supabase CLI (gen types) + Zod (/packages/types)
Automated TypeScript typing and schema validation.
Eliminates type drift between database models and frontend application payloads.
Preview deployments
Vercel
Automatic PR and branch preview environments.
Enables stakeholder review of features prior to production merges.
Database & RLS inspection
Supabase Dashboard + SQL Editor
Direct inspection of database schema and RLS policies.
Provides direct visibility into database behavior and security policies.
Error monitoring
Sentry
Production exception and stack trace tracking.
Automated error monitoring tailored for a lean development team.
Design handoff
Figma
Component, spacing, and interaction specifications.
Standardizes visual handoff requirements between design and development.
Pilot communication
WhatsApp Business
Pilot school support and feedback collection.
Matches existing operational communication channels of Liberian schools.
Weekly rhythm
Scheduled async syncs, mid-week touchpoints, Friday reviews.
Structured operational cadence.
Prevents operational stalls without requiring dedicated project managers.
Application hosting
Vercel
Production hosting and edge infrastructure.
Native deployment infrastructure for Next.js App Router.
Database backend
Supabase
Managed PostgreSQL, Auth, Storage, and RLS.
Provides backend capabilities while focusing effort on core logic.
Tenant security
Supabase PostgreSQL RLS
Database-level multi-tenant isolation.
Critical architectural boundary preventing cross-tenant data exposure.
Database migrations
Supabase CLI
Version-controlled schema updates.
Supports mandatory tenant-safety review gates (NFR-6.4.2).
Tenant provisioning
Transactional workflow
Automated tenant creation and setup.
Ensures atomic tenant provisioning matching FR-2.2.1 requirements.
Audit logging
Append-only Postgres table
Administrative action auditing.
Satisfies NFR-6.5.4 audit requirements for elevated access.
Auth & RBAC
Supabase Auth + JWT claims
User authentication and role enforcement.
Secures access control across Platform Admin, School Admin, Teacher, Student, and Parent roles.
Subdomain routing
Vercel + Middleware
Subdomain-based tenant resolution.
Enables multi-tenant routing without requiring custom domains at MVP.
Custom domains
Vercel domain mapping
Optional custom domain routing.
Fast-follow capability configured in database schema from day one.
Branding delivery
Server-side CSS custom properties
Dynamic white-label style injection.
Eliminates client-side style fetch waterfalls on page load.
Image handling
next/image + Supabase Storage
Asset storage and image optimization.
Optimizes image delivery for low-bandwidth mobile networks.
Background jobs
Supabase Edge Functions / Queues
Asynchronous task processing.
Prevents heavy processes (e.g., bulk invites) from blocking HTTP requests.
Email delivery
Resend
Transactional email services.
Reliable delivery of system invites, resets, and parent digests.
SMS delivery
Termii (evaluation) / Twilio (fallback)
Local SMS notification delivery.
Evaluates regional carrier delivery performance and cost in Liberia.
Automated testing
Vitest + Testing Library + Playwright
Unit, integration, and E2E testing.
Verifies critical authentication, tenant separation, and academic workflows.
Rate limiting
Application & gateway throttling
Endpoint abuse protection.
Protects authentication and upload endpoints from operational abuse.
Low-bandwidth telemetry
Custom Web Vitals tracking
Network performance monitoring.
Monitors real-world loading performance on low-bandwidth 2G/3G connections.

9.2 CI/CD process
See also: Section 8 for the tech stack view of this.
Pull request execution sequence:
[Feature Branch] ──► [Pull Request] ──► [Automated CI Check] ──► [Tenant-Safety Review Gate] ──► [Merge to Main] ──► [Vercel Preview Deploy] ──► [Production Promotion]


Every database migration must pass an explicit tenant-safety review verifying correct tenant_id column inclusion and active RLS policy coverage before merging.
10. Branding & GTM
10.1 Positioning
Pilot context: Pilot School #1.
For Liberian schools currently utilizing a School Management System (SMS) for administrative record-keeping, this LMS delivers the academic execution layer. It offers a lightweight, school-branded platform enabling teachers to publish lessons and assignments while allowing students and parents to track academic progress on low-cost mobile devices.
The platform is explicitly designed around local connectivity realities and operates alongside existing administrative SMS infrastructure without requiring system replacement.
10.2 Differentiation

Category
Legacy LMS Platforms
This Product
Non-Competitive Boundaries
Functional Scope
Broad enterprise feature sets designed for higher education.
Focused academic delivery workflows tailored for schools.
Does not compete on raw feature volume or complex institutional management.
Configuration
Complex setup requiring extensive technical administration.
Guided, lightweight setup completable in under two days.
Does not compete on deep software customization.
Identity & Branding
Generic platform-centric visual experience.
Fully white-labeled with distinct school identity and branding.
Does not force schools into a shared public platform brand.
Target Hardware
Optimized primarily for desktop browser environments.
Mobile-first architecture optimized for low-cost smartphones.
Does not focus on desktop-first learning workflows.
Connectivity Requirements
Assumes persistent, high-speed broadband connections.
Engineered specifically for low-bandwidth, unreliable 2G/3G networks.
Does not compete on high-bandwidth streaming or live media capabilities.
Administrative Role
Attempts to handle all administrative and financial operations.
Operates directly alongside existing school administrative SMS platforms.
Does not replace administrative fee collection, attendance, or payroll modules.
Communication Tools
Features heavy synchronous video and real-time collaboration suites.
Focuses on asynchronous lessons, assignments, submissions, and feedback.
Does not compete on live video conferencing or real-time virtual classrooms.
Reporting Depth
Complex, multi-variable institutional analytics and BI dashboards.
Simple, actionable submission, grade, and usage visibility.
Does not compete on enterprise business intelligence or complex grade analytics in MVP.

Core positioning wedge: The SMS manages the school; this product delivers the learning.
10.3 Ideal customer profile (ICP)
The primary target customer is an independent or privately operated Liberian school with 150 to 500 enrolled students. The institution typically utilizes an existing administrative SMS or spreadsheet setup, but teachers and students still rely on informal channels (e.g., WhatsApp) for academic distribution.
Key ICP criteria:
Decision-maker: Principal, proprietor, or head administrator with direct authority.
Academic structure: Established terms, classes, and subjects.
Pain point: Inconsistent lesson distribution, assignment tracking friction, and poor parent visibility.
Commercial sensitivity: High budget awareness; prefers predictable termly or annual school-level pricing.
Onboarding model: Assisted initial setup with direct leadership network access.
10.4 Messaging hierarchy
Top-line promise Provide your school with a simple, fully branded digital learning platform that runs alongside your existing administrative system.
Supporting proof points
Simple operational workflows: Core tasks—publishing lessons, submitting work, and grading—are completable within 3–4 taps without requiring formal training manuals (NFR-6.3.1, NFR-6.3.2).
Built for local connectivity: Engineered specifically for low-cost Android hardware and low-bandwidth 2G/3G mobile networks (NFR-6.2.1).
Complete institutional identity: Fully white-labeled per school with custom logos and color schemes driven by database tenant configuration.
Persona-specific messaging

Persona
Core Message
Underlying PRD Requirement
School Admin
"Organize your school's academic delivery without replacing your current administrative software."
Rapid guided setup covering branding, structure, users, and usage tracking.
Teacher
"Create lessons, publish assignments, grade student submissions, and reuse content across terms effortlessly."
Streamlined lesson editor, grading workflow, and term-to-term unit duplication.
Student
"Access your class lessons and turn in assignments directly from your phone, even on slow connections."
Lightweight mobile feed, optimized attachment loading, and offline lesson caching.
Parent
"Stay informed on your child's upcoming assignments, overdue work, and grades in real time."
Read-only child monitoring, grade summaries, and periodic activity digests.

10.5 Objection-handling sheet
"Why not just use WhatsApp groups?" WhatsApp chats lack academic structure, causing lessons, assignments, and grades to get buried in chat history. This platform provides an organized academic hierarchy (Course → Lesson → Assignment → Submission → Grade) that keeps learning materials permanently accessible and traceable by class and subject.
"What if the internet goes down?" The application is engineered low-bandwidth-first. Students can view recently cached lessons offline using PWA technology. While not a fully offline system, it withstands frequent connectivity drops common on local 2G/3G networks.
"We already have a school management system (SMS)." This product does not replace your SMS. Your SMS handles tuition fees, official transcripts, and administrative enrollment. This platform handles daily academic delivery—giving teachers a structured space to distribute lessons and grade assignments.
"Who owns and accesses our school's data?" Your school owns its data completely. Data is isolated at the database level using PostgreSQL Row-Level Security (RLS). Other schools cannot access your records, and administrative platform access is restricted and strictly audit-logged.
"Will our teachers actually adopt this?" The system requires zero advanced technical skills. Core teaching tasks take under 5 minutes to learn, and onboarding to the first published lesson takes under 30 minutes.
10.6 Acquisition channels
Distribution relies on direct, relationship-led outreach rather than paid advertising.

Rank
Channel
Operational Strategy
Effort
Role
1
Pilot reference case
Transform pilot success into short case studies and direct administrator introductions.
Medium
Primary long-term expansion driver based on verified local results.
2
Warm network outreach
Direct contact with school proprietors and principals within the founding network.
Medium
Immediate pipeline generator for early expansion schools.
3
Institutional referrals
Engage church education secretariats and school association leadership.
Medium
High-leverage channel generating multiple warm school introductions.
4
Direct WhatsApp outreach
Distribute concise one-page overviews and brief video demos directly to school leaders.
Low
Primary first-touch outreach mechanism in the local market.
5
In-person school demos
Conduct direct workflow demonstrations on mobile devices for school boards and principals.
High
High-conversion closing tool for qualified institutional prospects.

10.7 Pricing model hypothesis
Working hypothesis: Base school platform fee + active student tier.
Rather than charging individual teachers, students, or parents, subscriptions are structured at the institutional level:
Small School Tier: Up to 150 active students.
Medium School Tier: 151 to 350 active students.
Large School Tier: 351 to 500+ active students.
Validation parameters during pilot:
Track total enrollment vs. active monthly users.
Measure administrative support overhead per school.
Evaluate administrator preference between termly vs. annual billing schedules.
Maintain manual billing processing initially while supporting tenant record subscription states (FR-2.2.4).
10.8 90-Day GTM roadmap
Phase 1: Pilot validation (Weeks 1–6)
Launch Pilot School #1 and validate core P0 workflows.
Confirm complete tenant isolation and branding injection.
Validate teacher lesson creation, student submission, and grading loops.
Measure page load performance under throttled 3G connectivity conditions.
Gate to Phase 2: Do not expand until the core academic loop operates reliably without active developer intervention and teacher onboarding takes under 30 minutes.
Phase 2: Early expansion (Weeks 7–12)
Target: Onboard 5 expansion schools via warm network references.
Maintain assisted administrative setup and onboarding sequences.
Track onboarding duration and operational support overhead per school.
Test commercial reaction to proposed tier pricing models.
Phase 3: Strategic review (Week 13)
Evaluate active student retention, lesson publishing volume, and support tickets.
Compare pilot operational data against target PRD benchmarks (e.g., 70%+ weekly active student engagement).
Determine next operational phase: repeatable sales expansion, product hardening, or commercial model adjustment.
10.9 Brand identity brief
Visual characteristics
Clean: Restrained color usage, high-contrast text, generous whitespace.
Trustworthy: Professional typography, explicit tenant school identity, stable layout structures.
Efficient: Functional navigation prioritizing immediate user action over decorative visual elements.
Locally contextualized, highly polished: Purpose-built for Liberian school operational conditions while maintaining modern software visual standards.
Non-attributes
Not generic startup SaaS template aesthetics.
Not non-profit or aid distribution visual styles.
Not childish, highly gamified ed-tech interfaces.
Not dense, form-heavy administrative web portals.
10.10 Marketing assets checklist
One-page product datasheet: Clear explanation of value proposition, SMS integration, and low-bandwidth capabilities.
90-Second video demo: Screen recording demonstrating core flow: branding → lesson creation → student view → assignment submission → grading.
WhatsApp introduction template: Direct text script explaining product differentiation concise enough for mobile reading.
Pilot evidence summary: Single-page document highlighting pilot metrics, teacher quotes, and usage results.
Resetting demo environment: Dedicated multi-tenant demonstration workspace pre-populated with realistic sample classes and materials.
Simple landing page: Concise website covering core product features, SMS integration, and demo request contact forms.
Internal sales demo script: Standardized guide ensuring 15-minute product demonstrations remain focused on high-value academic workflows.
Objection handling sheet: Reference guide covering internet reliability, SMS co-existence, data ownership, and teacher adoption.
Simple lead tracking sheet: Centralized Google Sheet recording prospective school outreach, demo dates, and follow-up status.
10.11 GTM operating principle
The initial expansion goal is not immediate mass growth. The objective is establishing a reliable, repeatable operational sequence:
Introduction ──► Demo ──► Agreement ──► Provisioning ──► Branding ──► Setup ──► First Lesson ──► Student Activation ──► Retention


Success is achieved when this sequence executes smoothly without requiring direct engineering team intervention.
11. Name shortlist
11.1 Head-to-head: LearnGrid vs. TideLearn

Evaluation Criterion
LearnGrid
TideLearn
Semantic Category Fit
Strong. "Learn" defines purpose; "Grid" implies organized academic structure, classes, and subjects.
Moderate. "Learn" defines purpose, but "Tide" lacks obvious connection to academic structures.
Low-Bandwidth Association
Moderate. Communicates structural stability and reliable underlying grid architecture.
Indirect. Communicates movement or flow, requiring brand explanation.
Phonetic Clarity
Excellent. Simple English terms easily understood and spoken locally.
Moderate. "Tide" introduces potential local spelling ambiguities upon hearing.
First-Try Spelling
High. High probability of accurate transcription upon initial hearing.
Moderate. Requires clarification between "Tide", "Tied", or phonetic variants.
Subdomain Fit
Strong. Formats cleanly as school.learn.xx or school.learngrid.com.
Good. Formats as school.tide.xx, though educational context is less immediate.
Visual Identity Potential
Strong. Clean geometric grid marks, modular blocks, and structured node options.
Strong. Wave and fluid progression concepts, though less explicitly academic.
Recommendation
Recommended Name. Stronger semantic alignment with structured academic delivery.
Runner-Up / Fallback. Secondary option if primary name encounters legal clearance issues.

11.2 Recommended name: LearnGrid
Tagline options
Primary recommendation: Learning, organized for your school.
Alternative 1: The academic layer for your school.
Alternative 2: Connect lessons. Organize learning.
Positioning statement LearnGrid helps Liberian schools organize and deliver lessons, assignments, and learning on one reliable digital platform.
Color palette guidelines
Primary: Deep Trust Blue (communicates security, structure, and academic authority).
Secondary Accent: Vibrant Growth Green (communicates progress, active learning, and achievement).
Neutral Background: Light Warm Gray / Off-White (ensures high legibility on mobile screens under direct sunlight).
Logo and wordmark direction A clean geometric mark combining structured grid lines forming a stylized letter "L" or progressive path. Wordmark presented as a single term (LearnGrid) with typography optimized for mobile app headers and favicons.
11.3 Runner-up: TideLearn
Tagline options
Learning that keeps moving.
A simpler flow for learning.
Fallback condition TideLearn is retained strictly as a secondary fallback should formal legal trademark searches identify unexpected conflicts with LearnGrid.
11.4 Final decision record
Selected brand: LearnGrid
Full product designation: LearnGrid LMS
Parent entity: Dubardstudio
Formally dropped candidate names
EduNest: High conflict risk (3 active ed-tech products currently operating under this exact name).
EduPilot: High conflict risk (EduPilotPro operates as an active multi-tenant school platform in regional markets).
Studyflow: High conflict risk (multiple active educational software applications use this title).
SkulCloud: Moderate-high risk (numerous phonetic variants active in global school software categories).
Coursewise: Moderate risk (active commercial entity operating in education services).
11.5 Next actions before public commitment
Formal trademark clearance: Execute formal trademark search for "LearnGrid" across international databases and local business registries in Liberia.
Domain registration: Secure primary .com and regional domain names for platform and tenant routing.
Social media handle reservation: Reserve consistent social media profile handles across target platforms.
Brand asset finalization: Finalize vector logo assets, color tokens, and tenant CSS variables based on LearnGrid brand guidelines.
11.6 Working decision
LearnGrid is designated as the official working brand for product development, interface styling, and pilot documentation.
12. Open questions & decisions

Item / Question
Category
Status
Target / Owner
Can the final remaining School Admin remove themselves and lock out tenant access?
Business Logic / Security
Open
Needs resolution before finalizing School Admin removal rules.
Injected tenant_id JWT claims validation with Supabase Auth and RLS enforcement.
Architecture / Security
Spike needed
Backend partner. High-risk technical validation required prior to feature development.
Durable background job processing architecture (Edge Functions vs. pgmq queue) for bulk invites.
Technical Infrastructure
Spike needed
Backend partner. Resolve bulk onboarding workflow design.
SMS carrier selection and delivery verification in Liberia (Termii vs. Twilio).
Integrations / Product
Spike needed
Backend + Product. Test delivery performance on Orange/MTN networks.
Self-service tenant custom domain CNAME provisioning workflow automation.
Infrastructure
Open
Fast-follow feature; keep database fields prepared from day one.
Sampling methodology and storage strategy for low-bandwidth client Web Vitals performance telemetry.
Performance / Telemetry
Open
Frontend pair-programmers. Keep performance monitoring lightweight.

13. Next actions
(This section records operational tasks resulting from document review. Content pending formal review.)
Appendix: Mermaid diagrams
Appendix A: Core academic loop
flowchart TD
    C[Course]
    L[Lesson]
    M[Lesson Materials]
    A[Assignment]
    D[Due Date]
    S[Student Submission]
    G[Teacher Grade]
    F[Teacher Feedback]
    ST[Student]
    P[Parent]
    C --> L
    L --> M
    L --> A
    A --> D
    A --> ST
    ST --> S
    S --> G
    G --> F
    G --> ST
    F --> ST
    G --> P
    F --> P


Appendix B: Onboarding loop
flowchart TD
    PA[Platform Admin] --> T[Create Tenant]
    T --> B[Default Branding]
    T --> I[Generate School Admin Invite]
    I --> SA[School Admin Accepts Invite]
    SA --> W[School Setup Wizard]
    W --> BR[Configure Branding]
    BR --> AY[Create Academic Year]
    AY --> TR[Create Terms]
    TR --> CL[Create Classes]
    CL --> SU[Create Subjects]
    SU --> TI[Invite Teachers]
    TI --> SI[Import / Invite Students]
    SI --> PI[Invite / Link Parents]
    PI --> TC[Teacher Ready]
    TC --> LL[Teacher Publishes First Lesson]
    LL --> ST[Students Access Lesson]
    ST --> O[Onboarding Complete]


Appendix C: School setup loop
flowchart LR
    Start[School Admin Accepts Invite] --> Brand[Branding] --> Academic[Academic Structure] --> Users[User Setup] --> Assign[Assign Teachers & Students] --> Content[Courses / Lessons] --> FirstLesson[First Published Lesson] --> Ready[School Ready]


Appendix D: Teaching loop
flowchart TD
    Start[Teacher Login] --> Class[Select Class] --> Subject[Select Subject / Course] --> Lesson[Create Lesson] --> Materials[Attach Materials] --> Publish[Publish Lesson] --> Feed[Student Feed] --> Assignment[Create Assignment] --> Submit[Student Submits] --> Grade[Teacher Grades] --> Feedback[Teacher Feedback] --> Student[Student Views Grade] --> Reuse[Reuse Lesson] --> NextTerm[Next Term] --> Lesson



