# Information Architecture — Dubardstudio LMS

Source of truth for: persona trees, screen inventory, navigation.
Related: see /docs/flows.md for wireframe flows, /docs/data-model.md for schema.

---

## 1. Personas

### 1.1 Platform Admin

**Primary objective:** Provision schools, control tenant access and subscriptions, monitor onboarding, and perform authorized cross-tenant administration.

The PRD defines Platform Admin responsibilities as tenant provisioning, platform health and usage monitoring, and subscription control.

**Information architecture**
Platform Admin Console
├── Dashboard
│ ├── Total Tenants
│ ├── Active Tenants
│ ├── Trial Tenants
│ ├── Suspended Tenants
│ └── Onboarding Status
├── Tenants
│ ├── All Tenants
│ ├── Create Tenant
│ └── Tenant Details
│ ├── School Information
│ ├── Subdomain
│ ├── Subscription
│ ├── Onboarding Status
│ ├── Usage
│ └── Authorized Access
├── Subscriptions
│ ├── Trial
│ ├── Active
│ ├── Suspended
│ └── Cancelled
├── Platform Usage [P1]
│ ├── Users
│ ├── Storage
│ └── Activity
└── Audit
├── Cross-Tenant Access
├── Administrative Actions
└── Access Details


**Important boundary:** Platform Admin is not simply another tenant administrator. Normal users operate strictly within a single tenant. Platform Admin has a separate elevated path for cross-tenant operations, and those operations must be fully audited.

---

### 1.2 School Administrator

The School Admin's information architecture answers four operational questions:

- Is the school configured?
- Are the users onboarded?
- Is the academic structure ready?
- Is learning activity happening?

**Information architecture**
School Admin
├── Dashboard
│ ├── Setup Progress
│ ├── Teachers
│ ├── Students
│ ├── School Admins
│ ├── Published Lessons
│ ├── Assignments
│ └── Basic Usage
├── School Setup
│ ├── School Information
│ └── Branding
│ ├── School Logo
│ ├── Header Logo
│ ├── Favicon
│ ├── Primary Color
│ └── Secondary Color
├── Academic Setup
│ ├── Academic Years
│ ├── Terms
│ ├── Classes / Grade Levels
│ └── Subjects
├── People
│ ├── School Admins
│ │ ├── View
│ │ ├── Invite
│ │ └── Remove
│ ├── Teachers
│ │ ├── View
│ │ ├── Invite
│ │ ├── Bulk Invite
│ │ └── Assign Classes / Subjects
│ ├── Students
│ │ ├── View
│ │ ├── Invite
│ │ ├── CSV Import
│ │ └── Assign Classes
│ └── Parents
│ ├── View
│ ├── Invite
│ └── Link Children
├── Academic Content
│ ├── Courses
│ ├── Lessons
│ └── Assignments
└── Usage Overview [P1]
├── Login Activity
├── Lessons Published
└── Submission Activity


The PRD specifically calls for branding, academic structure, teacher/student/parent management, and simple usage monitoring.

---

### 1.3 Teacher

Teacher navigation is content-first, not administration-first.

**Information architecture**
Teacher
├── Home
│ ├── My Classes
│ ├── Recent Lessons
│ ├── Pending Grading
│ └── Upcoming Assignments
├── My Classes
│ └── Class
│ ├── Students
│ ├── Subjects
│ └── Courses
├── My Lessons
│ ├── All Lessons
│ ├── Drafts
│ ├── Published
│ └── Reusable
├── Create Lesson
│ ├── Select Class
│ ├── Select Subject
│ ├── Select Term
│ ├── Title
│ ├── Description
│ ├── Materials (PDF, Document, Image)
│ ├── External Video
│ └── Publish
├── Assignments
│   ├── All Assignments
│   ├── Create Assignment
│   ├── Upcoming
│   └── Past
├── Quizzes & Tests
│   ├── All Assessments
│   ├── Create Quiz / Test / Exam
│   ├── Upcoming
│   └── Past
├── Submissions
│   ├── Assignment
│   ├── Student List
│   ├── Submission
│   ├── Grade
│   └── Feedback
├── Grade Entry
│   ├── Select Assessment
│   ├── Class Roster
│   └── Bulk Save
└── Reuse
├── Duplicate Lesson
├── Duplicate Unit
└── Carry Forward


These functions map directly to the teacher MVP feature set, including lesson creation, organization, duplication, assignment creation, grading, and feedback.

---

### 1.4 Student

Student information architecture is kept intentionally simple.

**Information architecture**
Student
├── Home
│ └── Learning Feed
│ ├── New Lessons
│ ├── Assignments
│ ├── Due Soon
│ └── Recently Viewed
├── Classes
│ └── Class
│ └── Subjects
├── Subjects
│ └── Subject
│ └── Courses
├── Lessons
│ └── Lesson
│ ├── Content
│ ├── Materials
│ ├── Video Link
│ └── Download
├── Assignments
│ └── Assignment
│ ├── Instructions
│ ├── Due Date
│ ├── Materials
│ ├── Submit
│ └── Status
├── Grades
│ └── Grade
│ ├── Score
│ └── Teacher Feedback
└── Offline
└── Recently Viewed Lessons


The PRD prioritizes a chronological or subject-organized feed, low-bandwidth lesson access, assignment submission, and grades/feedback.

**Mobile navigation layout recommendation**
┌──────────────────────────┐
│ School Logo │
│ │
│ Main Content │
│ │
│ │
├──────────────────────────┤
│ Home │ Classes │ Grades │
└──────────────────────────┘


**Decision:** Keep **Assignments** as a dedicated tab only if testing shows students need a persistent assignment-focused destination. Otherwise, use a prominent due/assignment badge on **Home** to preserve the simpler three-item mobile navigation.

---

### 1.5 Parent

Parent navigation is monitoring-oriented.

**Information architecture**
Parent
├── Home
│ ├── Child Selector
│ ├── Upcoming Work
│ ├── Overdue Work
│ └── Recent Grades
├── Children
│ ├── Child 1
│ ├── Child 2
│ └── Add/Link Child
├── Child Overview
│ ├── Classes
│ ├── Subjects
│ ├── Lesson Activity
│ ├── Upcoming Assignments
│ ├── Overdue Assignments
│ └── Grades
├── Grades
│ └── Child Grades
└── Notifications
└── Weekly/Periodic Digest
├── Assignment Reminders
└── Progress Summary


The parent role is explicitly read-only and strictly scoped to linked children.

---

### 1.6 Recommended global navigation model

Navigation is customized per persona rather than uniform across the platform:

- **Platform Admin:** Dashboard | Tenants | Subscriptions | Usage | Audit
- **School Admin:** Dashboard | Setup | People | Academic | Content | Usage
- **Teacher:** Home | Classes | Lessons | Assignments | Grading
- **Student:** Home | Classes | Grades | Profile
- **Parent:** Home | Children | Assignments | Grades | Profile

This differentiation supports the PRD's central UX principle of simplicity and minimal training. Forcing every persona into identical information structures degrades usability. The PRD explicitly requires core workflows to be achievable within 3–4 taps or clicks from login.

---

## 2. Information Architecture

### 2.1 Global product structure

WHITE-LABEL LMS
│
├── Authentication
│ ├── Login
│ ├── Accept Invitation
│ ├── Set Password
│ ├── Password Reset
│ └── Session / Logout
│
├── Platform Layer
│ ├── Platform Admin
│ ├── Tenant Management
│ ├── Subscription Management
│ ├── Platform Usage
│ └── Audit
│
└── Tenant Layer
│
├── School Admin
│ ├── Dashboard
│ ├── School Branding
│ ├── Academic Setup
│ ├── People
│ ├── Courses
│ ├── Lessons
│ ├── Assignments
│ └── Usage Overview
│
├── Teacher
│ ├── Dashboard
│ ├── Classes
│ ├── Subjects
│ ├── Courses
│ ├── Lessons
│ ├── Assignments
│ ├── Submissions
│ ├── Grades & Feedback
│ └── Reusable Content
│
├── Student
│ ├── Home / Learning Feed
│ ├── Classes
│ ├── Subjects
│ ├── Courses
│ ├── Lessons
│ ├── Assignments
│ ├── Submission
│ ├── Grades & Feedback
│ └── Offline Content
│
└── Parent
├── Home
├── Children
├── Child Overview
├── Assignments
├── Grades
├── Lesson Activity
└── Digest / Notifications


### 2.2 MVP screen hierarchy

The MVP is structured across three primary application surfaces:

WHITE-LABEL LMS
│
┌──────────────┼──────────────┐
│ │ │
▼ ▼ ▼
PLATFORM TENANT AUTH
CONSOLE APP LAYER
│ │
│ ┌──────┼───────┐
│ │ │ │
▼ ▼ ▼ ▼
Admin School Teacher Student Parent
Admin


Inside the tenant application:

TENANT
│
┌───────────┴───────────┐
│ │
SETUP ACADEMIC
│ │
┌──────┼──────┐ ┌───────┼────────┐
│ │ │ │ │ │
Branding Users Academic Courses Lessons Assignments
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

- Tenant → Academic Structure → Content → Assessment → Outcomes

The platform layer separately governs:

- Tenant → Subscription → Access → Audit

### 2.3 P0 MVP boundary

*See also: Section 3 (MVP Feature Priority) for the screen-level view.*

The essential P0 execution loop required for the pilot includes:

- **Platform:** Create tenant → invite School Admin → control subscription → audit elevated access.
- **School Admin:** Brand school → configure academic structure → manage School Admins → invite users → assign users → monitor assignments and activity.
- **Teacher:** Select class → create lesson → publish → create assignment → receive submission → grade → provide feedback → reuse content.
- **Student:** Login → view feed → open lesson → download or view material → submit assignment → review grade and feedback.
- **Parent:** Login → select child → review upcoming or overdue work → review grades.

This aligns directly with PRD §4.2 and P0 feature tables.

### 2.4 P1 / P2 boundary

*See also: Section 3 (MVP Feature Priority) for the screen-level view.*

**P1 boundary**

- **Platform:** Usage dashboard.
- **School Admin:** Usage overview, lessons overview, assignments overview, student submission and grade views.
- **Teacher:** Reusable content library.
- **Student:** Offline-friendly Progressive Web App (PWA) caching, recently viewed lessons.
- **Parent:** Weekly or periodic digest.

**P2 boundary**

- **Platform:** Self-service tenant signup, automated billing and invoicing.
- **School Admin:** Custom domain configuration.
- **Teacher:** Co-teacher and shared classes.
- **Student:** Push and SMS notifications.
- **Parent:** Direct teacher messaging.

This scope preserves the priority classifications established in the PRD without expanding the MVP.

### 2.5 Final implementation principle

The primary UX directive is that the system must operate like five small applications sharing a unified academic data model, rather than a single monolithic LMS with five permission levels.

**Underlying data hierarchy**


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

---

## 3. MVP Feature Priority (Screen Inventory)

*See also: Section 2 for the information architecture view of this.*

### 3.1 Authentication & shared screens

| Screen | Persona | Priority | Purpose |
|---|---|---|---|
| Login | All | P0 | Authenticate user |
| Accept Invitation | All | P0 | Activate invited account |
| Set Password | All | P0 | Complete activation |
| Forgot Password | All | P0 | Recover access |
| Profile | All | P0 | Basic profile management |
| Logout | All | P0 | End session |
| Unbranded / Default Theme Fallback | System | P0 | Ensure tenants without configured branding render a valid default theme |

### 3.2 Platform admin screens

| Screen | Priority | Purpose |
|---|---|---|
| Platform Dashboard | P1 | Platform overview |
| Tenant List | P0 | View and manage schools |
| Create Tenant | P0 | Provision school |
| Tenant Details | P0 | View and edit tenant details |
| Subscription Control | P0 | Manage trial, active, suspended, or cancelled states |
| Onboarding Status | P0 | Monitor setup progress |
| Platform Usage | P1 | Monitor usage metrics |
| Cross-Tenant Access | P0 | Authorized administrative access |
| Audit Log | P0 | Record elevated access events |
| Self-Service Signup | P2 | Prospect self-onboarding |
| Billing / Invoices | P2 | Automated billing management |

### 3.3 School admin screens

| Screen | Priority | Purpose |
|---|---|---|
| School Dashboard | P0 | School overview |
| Setup Wizard | P0 | Guide initial configuration |
| School Information | P0 | Manage school metadata |
| Branding | P0 | Logo, colors, and favicon configuration |
| Academic Years | P0 | Manage academic years |
| Terms | P0 | Manage terms |
| Classes | P0 | Manage classes and grade levels |
| Subjects | P0 | Manage subjects |
| Manage School Admins | P0 | Invite or remove additional School Admins |
| Teacher List | P0 | Manage teachers |
| Invite Teacher | P0 | Invite individual teacher |
| Bulk Teacher Import | P0 | Bulk teacher onboarding |
| Student List | P0 | Manage students |
| Bulk Student Import | P0 | Bulk student onboarding |
| Parent List | P0 | Manage parents |
| Parent-Child Linking | P0 | Link parents to students |
| Teacher/Class/Subject Assignment | P0 | Assign academic responsibilities |
| Courses | P0 | Manage courses |
| Lessons Overview | P1 | View lessons across the school |
| Assignments Overview | P1 | View assignments across the school |
| Student Submission/Grade View | P1 | View student submissions and grades |
| Usage Overview | P1 | Monitor school usage |
| Custom Domain | P2 | Configure CNAME or custom domain |

*Note: Lessons Overview, Assignments Overview, and Student Submission/Grade View are classified as P1 for administrative IA. They are distinct from the core P0 setup and management tools defined in PRD §4.2.*

### 3.4 Teacher screens

| Screen | Priority |
|---|---|
| Teacher Dashboard | P0 |
| My Classes | P0 |
| Class Detail | P0 |
| Subject / Course View | P0 |
| Lesson List | P0 |
| Create Lesson | P0 |
| Edit Lesson | P0 |
| Lesson Preview | P0 |
| Publish / Unpublish | P0 |
| Lesson Materials | P0 |
| Assignment List | P0 |
| Create Assignment | P0 |
| Assignment Detail | P0 |
| Submission List | P0 |
| Submission Detail | P0 |
| Grade Submission | P0 |
| Grade Entry (Bulk) | P0 |
| Feedback | P0 |
| Reuse / Duplicate Lesson | P0 |
| Reusable Content Library | P1 |
| Co-Teacher Management | P2 |

*Note: The Teacher has two grading paths. Submission-based grading applies
to assignments (student submitted digital work). Grade Entry (Bulk) applies
to score-only assessments — quizzes, tests, and exams that are marked on
paper and entered into the LMS. Both paths appear in Pending Grading.*

### 3.5 Student screens

| Screen | Priority |
|---|---|
| Student Login | P0 |
| Student Home / Feed | P0 |
| Class View | P0 |
| Subject View | P0 |
| Course View | P0 |
| Lesson View | P0 |
| Material Viewer / Download | P0 |
| Assignment View | P0 |
| Assignment Submission | P0 |
| Submission Status | P0 |
| Grades | P0 |
| Feedback | P0 |
| Recently Viewed / Offline Lessons | P1 |
| PWA Install Experience | P1 |
| Push / SMS Notifications | P2 |

*Note: The Student Grades screen shows two kinds of items — grades for
assignments the student submitted, and grades for paper-based quizzes,
tests, and exams recorded by the teacher. Both appear in a single list
grouped by subject. The student did not submit anything for the second
type; the grade simply appears once the teacher releases it.*

### 3.6 Parent screens

| Screen | Priority |
|---|---|
| Parent Login | P0 |
| Parent Home | P0 |
| Child Selector | P0 |
| Child Overview | P0 |
| Upcoming Assignments | P0 |
| Overdue Assignments | P0 |
| Grades | P0 |
| Teacher Feedback | P0 |
| Lesson Activity | P0 |
| Link Child | P0 |
| Weekly / Periodic Digest | P1 |
| Teacher Messaging | P2 |

