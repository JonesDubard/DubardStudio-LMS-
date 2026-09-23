# Wireframe Flows — Dubardstudio LMS

ASCII and Mermaid flows for each persona's P0 workflows.
Related: /docs/ia.md for the screen inventory these flows reference.
Rendered diagrams: see Appendix A–D for Mermaid source.

---

## 1. Platform Admin flows

### 1.1 Tenant provisioning

[Platform Login] ──► [Platform Dashboard] ──► [Tenants] ──► [+ Create Tenant]
│
▼
┌──────────────────────┐
│ School Information │
│ │
│ School Name │
│ Contact Person │
│ Contact Email │
│ Subdomain │
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
│ System Execution │
│ - Creates tenant │
│ - Creates default brand │
│ - Creates settings │
│ - Generates Admin invite │
└──────────┬───────────────┘
│
▼
[Tenant Detail]
│
┌───────────┼───────────┐
▼ ▼ ▼
[Status] [Setup] [Usage]


Automatic default branding, School Admin invitation generation, and default settings align with PRD §2.2.2 requirements.

### 1.2 Subscription control

[Tenants] ──► [Tenant Detail] ──► [Subscription]
│
▼
┌────────────────────┐
│ Current Status │
│ ○ Trial │
│ ○ Active │
│ ○ Suspended │
│ ○ Cancelled │
└─────────┬──────────┘
│
▼
[Change Status] ──► [Confirm Action] ──► [Audit Event Created] ──► [Updated Tenant]


Subscription status gates system access at the authentication layer.

### 1.3 Audit

[Platform Console] ──► [Audit]
│
▼
┌──────────────────────────────┐
│ Audit Log │
├──────────────────────────────┤
│ Date │
│ Admin │
│ Tenant │
│ Action │
│ Resource │
│ Result │
└──────────────┬───────────────┘
│
▼
[Audit Detail] ──► [Access Context]


Cross-tenant Platform Admin access is fully audit-logged under NFR-6.5.4.

---

## 2. School Admin flows

### 2.1 Branding
[Accept Invitation] ──► [Set Password] ──► [School Setup Wizard] ──► [Branding]
│
┌──────────────────────────┼──────────────────────────┐
▼ ▼ ▼
[Upload Logo] [Primary Color] [Secondary Color]
│
▼
[Favicon]
│
▼
[Preview] ──► [Save / Skip] ──► [Academic Setup]


The branding wizard is guided, skippable, and revisitable per PRD §2.3 requirements.

### 2.2 Academic setup

[Academic Setup] ──► [Academic Year] ──► [Terms] ──► [Classes] ──► [Subjects]
│
▼
[Assign Teachers] ──► [Assign Students] ──► [Academic Structure Ready]


### 2.3 Invitations

[Users]
│
├──────────────────────────────┐
▼ ▼
[Teachers] [Students]
│ │
▼ ▼
[Invite] [CSV Import]
│ │
▼ ▼
[Email] [Validate]
│ │
▼ ▼
[Invitation] [Import]
│ │
└──────────────┬───────────────┘
▼
[Users Active]


Parent onboarding follow-up flow:

[Parents] ──► [Invite / Import] ──► [Link Parent] ──► [Select Student(s)] ──► [Confirm]


### 2.4 Manage school admins
[School Admin Dashboard] ──► [People] ──► [School Admins]
│
▼
┌─────────────────────────────┐
│ Manage School Admins │
├─────────────────────────────┤
│ Admin Name │
│ Email │
│ Status │
│ │
│ [+ Invite School Admin] │
└──────────────┬──────────────┘
│
┌──────────────┴──────────────┐
▼ ▼
[Invite Admin] [Select Admin]
│ │
▼ ▼
[Email Address] [Admin Details]
│ │
▼ ▼
[Send Invite] [Remove Admin]
│ │
▼ ▼
[Invite Sent] [Confirm Removal] ──► [Admin Removed]


**Open question:** Can the last remaining School Admin remove themselves or lock the tenant out? This must be resolved before implementing admin removal rules.

### 2.5 Assignments overview

[School Dashboard] ──► [Assignments]
│
▼
┌─────────────────────────────┐
│ Assignment Overview │
├─────────────────────────────┤
│ Assignment │
│ Teacher │
│ Class │
│ Due Date │
│ Submissions │
│ Graded │
└──────────────┬──────────────┘
│
▼
[Assignment Detail] ──► [Submission Overview]


---

## 3. Teacher flows

### 3.1 Lesson creation

[Teacher Home] ──► [My Classes] ──► [Select Class] ──► [Select Subject/Course] ──► [Lessons] ──► [+ Create Lesson]
│
▼
┌───────────────────────────────┐
│ Lesson Editor │
│ Title │
│ Description │
│ Materials (PDF/Doc/Image) │
│ External Video Link │
└───────────────┬───────────────┘
│
▼
[Save Draft] ──► [Preview] ──► [Publish] ──► [Student Feed]


The MVP supports PDF, document, and image attachments alongside external video links, deferring direct video uploads.

### 3.2 Assignment creation

[Lesson] ──► [+ Add Assignment]
│
▼
┌─────────────────────────┐
│ Assignment │
│ Title │
│ Instructions │
│ Due Date │
│ Materials │
└───────────┬─────────────┘
│
▼
[Preview] ──► [Publish] ──► [Student Assignment]


### 3.3 Grading
[Teacher Home] ──► [Pending Grading] ──► [Assignment] ──► [Submission List] ──► [Student Submission]
│
▼
┌─────────────────────────┐
│ Submission │
│ Student │
│ Submitted Work │
│ Grade: [____] │
│ Feedback: [________] │
└───────────┬─────────────┘
│
▼
[Release] ──► [Student Grades]


### 3.4 Lesson reuse

[My Lessons] ──► [Lesson] ──► [More] ──► [Duplicate / Carry Forward] ──► [Select New Term/Year] ──► [Review] ──► [Create Copy] ──► [New Draft] ──► [Publish]


Lesson and unit duplication across terms is a core P0 capability mandated by PRD §4.3.

---

## 4. Student flows

### 4.1 Mobile learning feed

[Login] ──► [Student Home]
│
▼
┌──────────────────────────┐
│ TODAY │
│ New Lesson: Math │
│ Assignment Due: English │
│ Recently Viewed │
└────────────┬─────────────┘
│
▼
[Open Content]


The feed provides a simplified work queue prioritizing chronological and subject-organized items.

### 4.2 Lesson viewing

[Feed] ──► [Lesson]
│
▼
┌──────────────────────┐
│ LESSON TITLE │
│ Text / Description │
│ [Download PDF] │
│ [View Image] │
│ [Watch Video ↗] │
└──────────┬───────────┘
│
▼
[Recently Viewed] ──► [Offline Cache]


**Progressive loading order:** Text → Structure → Compressed Images → Heavy Attachments On-Demand.

### 4.3 Assignment submission

[Student Feed] ──► [Assignment]
│
▼
┌────────────────────────┐
│ Instructions │
│ Due: Date/Time │
│ [Write Answer] │
│ [Attach File] │
└───────────┬────────────┘
│
▼
[Submit Work] ──► [Confirmation] ──► [Submission Status]


### 4.4 Grades

[Home] ──► [Grades] ──► [Subject] ──► [Assignment]
│
▼
┌────────────────────────┐
│ Grade │
│ Score │
│ Teacher Feedback │
└────────────────────────┘


### 4.5 Offline access
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

---

## 5. Parent flows

### 5.1 Linked children

[Parent Login] ──► [Parent Home]
│
▼
┌──────────────────────┐
│ CHILDREN │
│ ○ Child A │
│ ○ Child B │
└──────────┬───────────┘
│
▼
[Select Child] ──► [Child Overview]


### 5.2 Upcoming / overdue work
[Child Overview] ──► [Assignments]
│
┌───────────┴───────────┐
▼ ▼
[Upcoming] [Overdue]
│ │
▼ ▼
Assignment A Assignment B


### 5.3 Grades

[Child Overview] ──► [Grades] ──► [Subject] ──► [Assignment] ──► [Grade + Feedback]


### 5.4 Digest
[System] ──► [Periodic Digest] ──► [Child Activity / Reminders / Grades] ──► [Email / SMS]


Periodic digests are categorized as P1. Preferred communication channels remain an open product question.

---

## 6. New flow — Score-only assessment grading (quiz / test / exam)

*Added after paper-based quiz confirmation. See living doc §7 for context.*
[Teacher Home]
│
▼
[Pending Grading]
│
▼
[Assessment: type=quiz/test/exam]
│
▼
[Grade Entry Table — one row per student]
│
▼
[Enter Score per Student]
│
▼
[Save Draft] ──► [Release to Students]
│
▼
[Student/Parent Grades View]


---

## Appendix A: Core academic loop

```mermaid
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

    flowchart LR
    Start[School Admin Accepts Invite] --> Brand[Branding] --> Academic[Academic Structure] --> Users[User Setup] --> Assign[Assign Teachers & Students] --> Content[Courses / Lessons] --> FirstLesson[First Published Lesson] --> Ready[School Ready]

    flowchart TD
    Start[Teacher Login] --> Class[Select Class] --> Subject[Select Subject / Course] --> Lesson[Create Lesson] --> Materials[Attach Materials] --> Publish[Publish Lesson] --> Feed[Student Feed] --> Assignment[Create Assignment] --> Submit[Student Submits] --> Grade[Teacher Grades] --> Feedback[Teacher Feedback] --> Student[Student Views Grade] --> Reuse[Reuse Lesson] --> NextTerm[Next Term] --> Lesson

    