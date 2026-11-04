# SalahNear -- Admin Side Integration & Development Guide

## 1. Document Purpose

This document defines the complete administrative system for the
SalahNear Flutter Prayer Reminder and Mosque-Based Gamification
Application.

The administration system is a separate, secure web application built
with **Next.js** and integrated with **Supabase Auth, PostgreSQL,
PostGIS, and Supabase Storage**.

The Flutter mobile application is for regular users and must not expose
administrative overrides or privileged operations. All administration is
performed through the web-based Admin Portal.

This guide covers:

-   Admin authentication and login
-   Admin roles, permissions, and access scopes
-   Super Admin and Mosque Admin experiences
-   User and administrator management
-   Mosque discovery, verification, and location management
-   Prayer schedules and Iqamah timetable management
-   Attendance review and anti-fraud checks
-   Dynamic QR check-in
-   Points, streaks, and leaderboard moderation
-   Announcements, events, and support
-   Audit logs, security, database design, and implementation phases

------------------------------------------------------------------------

## 2. System Architecture

### 2.1 Applications

There are two separate client applications:

1.  **Flutter Mobile App**
    -   Used by registered members.
    -   Displays prayer times, mosque information, reminders,
        activities, points, streaks, and leaderboards.
    -   Allows users to submit attendance or activity evidence according
        to the application rules.
    -   Does not provide administrative overrides.
2.  **Next.js Admin Portal**
    -   Used by authorized administrators.
    -   Provides secure admin login and role-based dashboards.
    -   Manages mosques, prayer schedules, attendance reviews, points
        moderation, users, announcements, and system settings.
    -   Executes privileged actions through protected server-side routes
        or Supabase Edge Functions.

Both applications may use the same Supabase project, but they must have
different permissions.

### 2.2 High-Level Architecture

``` mermaid
flowchart TD
    U[Flutter Mobile App] -->|Supabase Auth / permitted APIs| SB[Supabase]
    A[Next.js Admin Portal] -->|Admin Authentication| AUTH[Supabase Auth]
    A -->|Protected server actions| API[Server API / Edge Functions]
    API --> DB[(PostgreSQL + PostGIS)]
    API --> ST[Private Supabase Storage]
    AUTH --> DB
    DB --> RLS[Row Level Security]
    DB --> AUDIT[Audit Logs]
    API --> FCM[Push Notification Service]
```

### 2.3 Recommended Technology Stack

  -----------------------------------------------------------------------
  Area                                Technology
  ----------------------------------- -----------------------------------
  Admin frontend                      Next.js (App Router)

  UI                                  Tailwind CSS and a reusable
                                      component library

  Authentication                      Supabase Auth

  Database                            PostgreSQL

  Geospatial data                     PostGIS

  File evidence                       Private Supabase Storage

  Server-side privileged operations   Next.js server routes/actions or
                                      Supabase Edge Functions

  Push notifications                  Firebase Cloud Messaging (FCM)

  Maps                                A map provider with geospatial
                                      support

  QR scanning in mobile app           Flutter `mobile_scanner` package

  Audit trail                         PostgreSQL `audit_logs` table
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 3. Admin Authentication and Login

### 3.1 Two Admin Login Types

The Admin Portal must provide one secure login experience with two
authorized admin account types:

1.  **Super Admin**
2.  **Mosque Admin**

The login page should allow an administrator to sign in using the
configured authentication method, such as email and password. The
account's assigned role and permissions must be loaded securely from the
database after authentication.

The user must not be able to select a role and thereby grant themselves
that role. The role is assigned by an authorized administrator and
verified server-side.

Suggested login page:

-   Application logo and name
-   Email field
-   Password field
-   Show/hide password control
-   Sign In button
-   Forgot Password link
-   Clear validation and authentication error messages
-   Optional two-factor authentication if enabled for the account

Do not provide public self-registration for administrator accounts.
Admin accounts must be created or invited by an authorized
administrator.

### 3.2 Login and Routing Flow

``` mermaid
flowchart TD
    L[Admin Login Page] --> S[Supabase Auth Sign In]
    S --> V{Authentication successful?}
    V -->|No| E[Show safe error message]
    V -->|Yes| P[Load active admin profile and roles]
    P --> C{Account active and authorized?}
    C -->|No| D[Deny access and record security event]
    C -->|Yes| T{Admin type}
    T -->|Super Admin| SD[Super Admin Dashboard]
    T -->|Mosque Admin| MD[Mosque Admin Dashboard]
```

### 3.3 Authentication Requirements

-   Use Supabase Auth for identity and session management.
-   Verify the authenticated user's active admin record on the server.
-   Enforce role permissions through database RLS and protected
    server-side operations.
-   Do not trust role names, user IDs, or permissions sent by the
    browser.
-   Do not store Supabase service-role keys in browser code or the
    Flutter application.
-   Protect admin routes and server actions.
-   Implement secure password reset.
-   Support account suspension and administrator deactivation.
-   Apply session expiry and re-authentication for highly sensitive
    actions.
-   Consider mandatory MFA for Super Admin accounts.
-   Log successful and failed admin sign-in events without storing
    passwords or tokens.

### 3.4 Account Types and Role Assignment

There are two portal entry types, but the authorization model contains
six administrative roles:

  -----------------------------------------------------------------------
  Admin type              Role                    Description
  ----------------------- ----------------------- -----------------------
  Super Admin login       Super Admin             Platform-wide control

  Super Admin-managed     State Admin             State-level oversight
  role                                            

  Super Admin-managed     District Admin          District-level
  role                                            management

  Super Admin-managed     Attendance Reviewer     Flagged attendance
  role                                            review

  Super Admin-managed     Support Admin           User support and
  role                                            disputes

  Mosque Admin login      Mosque Admin            Management of assigned
                                                  mosque(s)
  -----------------------------------------------------------------------

State Admin, District Admin, Attendance Reviewer, and Support Admin
accounts are created and managed by the Super Admin. They may use the
same secure Admin Portal login page, but after authentication they must
be routed to their own permitted dashboard and actions.

Mosque Admin accounts are also authenticated through the portal and are
restricted to the mosque or mosques assigned to them.

**Important:** "Super Admin" and "Mosque Admin" are the two primary
login/account categories requested for the portal experience. The other
four roles are subordinate administrative roles managed by Super Admin.
They are not allowed to gain Super Admin privileges.

### 3.5 Administrator Lifecycle

Super Admin must be able to:

-   Create or invite an administrator.
-   Assign one of the permitted roles.
-   Assign a state, district, or mosque scope as appropriate.
-   Activate, suspend, or deactivate an account.
-   Reset or initiate password recovery.
-   Reassign an administrator when responsibilities change.
-   Review that administrator's audit history.

A role or scope change must be recorded in the audit log. Deactivating
an admin must immediately prevent future privileged operations, even if
an old browser tab remains open.

------------------------------------------------------------------------

## 4. Role-Based Access Control (RBAC)

### 4.1 Roles and Scope

  -----------------------------------------------------------------------
  Role                    Scope                   Main permissions
  ----------------------- ----------------------- -----------------------
  Super Admin             Entire platform         Manage administrators,
                                                  global settings, role
                                                  assignments, disputes,
                                                  points reversals, and
                                                  platform-wide data

  State Admin             Assigned state          View state-wide
                          (initially Kerala)      performance, oversee
                                                  districts, publish
                                                  state announcements

  District Admin          Assigned district       Review and verify
                                                  mosques, correct mosque
                                                  details and
                                                  coordinates, assign
                                                  Mosque Admins

  Mosque Admin            Assigned mosque(s) only Update Iqamah
                                                  schedules, manage
                                                  mosque QR display,
                                                  mosque events, and
                                                  local information

  Attendance Reviewer     Assigned review queue   Review flagged
                                                  attendance, inspect
                                                  evidence, approve or
                                                  reject claims within
                                                  policy

  Support Admin           User support scope      Handle account recovery
                                                  requests, investigate
                                                  reported issues, and
                                                  manage support disputes
  -----------------------------------------------------------------------

### 4.2 Permission Principles

-   Apply least-privilege access: each role receives only the
    permissions needed for its work.
-   A user may have more than one role only if explicitly approved and
    supported by the permission model.
-   Every role must have a defined geographic or entity scope.
-   District Admins must not access or modify another district's records
    unless explicitly granted.
-   Mosque Admins must only access assigned mosques.
-   Attendance Reviewers must not change mosque timetables or
    administrator roles.
-   Support Admins must not modify points or approve attendance unless
    separately authorized.
-   Only Super Admin may assign or revoke administrative roles.
-   UI visibility is not security. Enforce permissions in RLS and
    server-side operations.

### 4.3 Example Permission Matrix

  ----------------------------------------------------------------------------------
  Feature           Super State Admin    District     Mosque     Reviewer    Support
                    Admin                   Admin      Admin                   Admin
  ------------ ---------- ----------- ----------- ---------- ------------ ----------
  View                Yes       State    District   Assigned        Queue    Support
  platform                                            mosque              
  dashboard                                                               

  Manage admin        Yes          No          No         No           No         No
  roles                                                                   

  Create State        Yes          No          No         No           No         No
  Admin                                                                   

  Create              Yes          No          No         No           No         No
  District                                                                
  Admin                                                                   

  Assign              Yes          No Yes, scoped         No           No         No
  Mosque Admin                                                            

  Verify              Yes    Optional Yes, scoped         No           No         No
  mosque                    oversight                                     

  Edit mosque         Yes      Scoped Yes, scoped    Limited           No         No
  details                      policy               assigned              
                                                      fields              

  Edit Iqamah         Yes          No    Optional       Yes,           No         No
  timetable                             oversight   assigned              
                                                      mosque              

  Display             Yes          No          No       Yes,           No         No
  dynamic QR                                        assigned              
                                                      mosque              

  Review              Yes   Oversight    Optional         No          Yes         No
  flagged                                                                 
  attendance                                                              

  Reverse             Yes          No          No         No      Only if         No
  points                                                       explicitly 
                                                                  granted 

  Manage              Yes          No          No         No           No        Yes
  support                                                                 
  cases                                                                   

  View audit          All State scope    District Own mosque       Review    Support
  logs                                      scope    actions      actions    actions
  ----------------------------------------------------------------------------------

"Optional" permissions must be explicitly decided and implemented; they
must not be assumed from the table. The database permission policy is
the final authority.

------------------------------------------------------------------------

## 5. Admin Portal Navigation and Pages

### 5.1 Shared Portal Layout

The portal should include:

-   Responsive sidebar navigation
-   Top navigation bar
-   Current administrator name and role
-   Current scope (state, district, or assigned mosque)
-   Notifications
-   Profile and security settings
-   Logout
-   Search and filters where appropriate
-   Loading, empty, error, and access-denied states

### 5.2 Super Admin Navigation

1.  Dashboard
2.  Administrator Management
3.  Role & Permission Management
4.  State Management
5.  District Management
6.  Mosque Management
7.  Prayer Schedules
8.  Attendance Review
9.  User Management
10. Points & Leaderboard
11. Announcements
12. Events
13. Support & Disputes
14. Audit Logs
15. System Settings

### 5.3 Mosque Admin Navigation

1.  Dashboard
2.  My Mosque(s)
3.  Mosque Profile
4.  Prayer & Iqamah Timetable
5.  QR Check-in Display
6.  Mosque Events
7.  Local Announcements
8.  Attendance Overview (read-only unless separately authorized)
9.  Admin Profile and Security

Mosque Admins must not see global administrator management, other
districts' mosque data, platform-wide points controls, or global
settings.

### 5.4 Scoped Admin Navigation

State Admin, District Admin, Attendance Reviewer, and Support Admin
should see only the pages permitted to their role. Do not show
inaccessible modules as active navigation links.

------------------------------------------------------------------------

## 6. Dashboard Requirements

### 6.1 Super Admin Dashboard

Show platform-level information such as:

-   Total registered users
-   Active users
-   Total mosques
-   Pending mosque verifications
-   Verified mosques
-   Total administrators by role
-   Attendance submissions today
-   Flagged attendance waiting for review
-   Recent points reversals
-   Recent admin activity
-   District-wise participation summary
-   System alerts

### 6.2 State Admin Dashboard

Show:

-   State-wide registered users
-   District-wise mosque counts
-   District-wise participation summaries
-   Pending issues requiring escalation
-   State announcements
-   Aggregate attendance and activity trends

### 6.3 District Admin Dashboard

Show:

-   District mosque count
-   Pending mosque verification queue
-   Verified and rejected mosques
-   Mosque Admin assignments
-   Mosque location correction requests
-   District-level activity summaries

### 6.4 Mosque Admin Dashboard

Show only assigned mosque data:

-   Mosque name and verification status
-   Current prayer timetable
-   Next prayer and Iqamah time
-   QR display status
-   Recent mosque events
-   Local announcements
-   Timetable update history
-   Relevant attendance overview, if permitted

### 6.5 Attendance Reviewer Dashboard

Show:

-   Pending flagged records
-   High-risk records
-   Review status
-   Evidence availability
-   Review history
-   Filters by date, prayer, mosque, and risk reason

### 6.6 Support Admin Dashboard

Show:

-   Open support tickets
-   Account recovery requests
-   User reports
-   Mock-location investigation cases
-   Friend or participation disputes
-   Case status and resolution history

------------------------------------------------------------------------

## 7. Core Workflow 1 -- Mosque Ingestion and Verification

### 7.1 Mosque Data Ingestion

Use an OpenStreetMap (OSM) / Overpass pipeline to discover possible
mosques in the selected geography.

Imported records must enter a staging queue. They must not automatically
become verified mosques.

Initial status:

-   `pending`

Possible subsequent statuses:

-   `under_review`
-   `verified`
-   `rejected`
-   `needs_correction`
-   `archived`

### 7.2 District Admin Review

The District Admin should be able to:

-   View mosque candidates on a map and in a list.
-   Search by mosque name or locality.
-   Inspect English and Malayalam names.
-   Edit address and locality details.
-   Correct latitude and longitude.
-   Set an entrance point or relevant geofence geometry.
-   Detect possible duplicate mosque records.
-   Add verification notes.
-   Submit the mosque for verification.

### 7.3 Verification

After confirming the mosque details with a reliable local source or
mosque committee, an authorized District Admin can mark it as verified.

Record:

-   Verifying administrator
-   Verification date and time
-   Verification notes
-   Source or confirmation details
-   Previous and new status

### 7.4 Geofence Configuration

Store an `attendance_radius_m` value for each mosque.

A typical starting range may be 100--150 metres, but it must be
configurable according to the mosque's layout and local GPS conditions.

Do not treat distance as the only proof of attendance. Consider GPS
accuracy, device signals, QR validation if enabled, and review rules.

### 7.5 Mosque Management UI

Recommended fields:

-   Mosque name (English)
-   Mosque name (Malayalam)
-   State
-   District
-   Locality
-   Address
-   Latitude
-   Longitude
-   Entrance coordinates or geometry
-   Attendance radius
-   Verification status
-   Verification notes
-   QR check-in enabled/disabled
-   Assigned Mosque Admins

------------------------------------------------------------------------

## 8. Core Workflow 2 -- Prayer Schedule and Iqamah Timetable

### 8.1 Prayer Time Sources and Priority

Use this source priority:

1.  Verified mosque timetable
2.  Authorized mosque/admin update
3.  Local religious authority source
4.  Calculated fallback

The UI must clearly identify whether a displayed time is
mosque-announced, authority-provided, or calculated.

### 8.2 Mosque Admin Timetable Editor

For each assigned mosque, the Mosque Admin can manage:

-   Fajr
-   Dhuhr
-   Asr
-   Maghrib
-   Isha
-   Jummah schedule, where applicable
-   Effective date
-   Optional special-day schedule
-   Notes or reason for a change

Keep prayer start times and congregational Iqamah times as separate
fields. Do not mix the two.

### 8.3 Versioning and History

Every timetable update must create a new version in `prayer_schedules`
or a related history table.

Example:

-   Version 1: Fajr Iqamah 05:30
-   Version 2: Fajr Iqamah 05:40

Do not overwrite historical schedule records in a way that destroys the
previous values.

Record:

-   Mosque ID
-   Version number
-   Effective date
-   Prayer values
-   Updated by
-   Updated at
-   Change reason

### 8.4 Mobile Synchronization

When a timetable changes:

1.  Save the new version.
2.  Emit a schedule-updated event.
3.  Notify affected mobile clients through the chosen synchronization
    mechanism.
4.  Flutter clients refresh the mosque schedule.
5.  Flutter clients cancel obsolete local alarms.
6.  Flutter clients schedule new alarms using the updated values.

Push notification delivery should not be the only source of truth. The
app must also refresh schedules when it opens or resumes and handle
missed notifications.

------------------------------------------------------------------------

## 9. Core Workflow 3 -- Attendance Review and Suspicious Activity Queue

### 9.1 Attendance Submission

When a user submits prayer attendance, the backend should validate the
submission and evaluate risk signals.

Possible signals:

-   Distance from mosque entrance
-   GPS accuracy
-   Device timestamp and server timestamp
-   Mock-location indicator, where available
-   QR session validity, if enabled
-   Duplicate image hash
-   Repeated or unusual submission patterns
-   User's previous reliability history

Client-provided device signals are not guaranteed proof. Treat them as
risk indicators rather than unquestionable facts.

### 9.2 Attendance Statuses

Recommended statuses:

-   `pending`
-   `verified`
-   `flagged`
-   `rejected`
-   `reversed`

Use explicit, documented transitions. A flagged record must enter the
review queue rather than being silently approved.

### 9.3 Flagging Rules

A borderline distance, weak GPS accuracy, inconsistent timestamps,
duplicate evidence, or other suspicious signal may cause a record to be
flagged.

The guide's initial example is:

-   0--50m: normal verification candidate
-   50--100m: review candidate
-   Beyond configured radius: reject or investigate according to policy

These are configurable examples, not universal guarantees. GPS accuracy
and mosque-specific geofence settings must be considered.

### 9.4 Reviewer Interface

The Attendance Reviewer should see:

-   User profile and relevant reliability history
-   Mosque name and location
-   Prayer and attendance date
-   Device timestamp
-   Server timestamp
-   GPS accuracy in metres
-   Calculated distance from mosque entrance
-   Risk reasons
-   Mock-location signal, if supplied
-   Duplicate image hash result
-   Secure photo evidence preview
-   Previous review actions

### 9.5 Private Photo Evidence

Store evidence in a private Supabase Storage bucket, for example:

`attendance-evidence/`

Generate short-lived signed URLs only after verifying the reviewer's
authorization. Do not make the bucket public or expose permanent public
evidence links.

### 9.6 Review Actions

Reviewer actions:

-   Approve
-   Reject
-   Escalate
-   Add internal review note

Require a reason for rejection or escalation. Record the reviewer,
decision, timestamp, and relevant evidence references.

A reviewer must not be able to review or alter records outside their
assigned scope.

------------------------------------------------------------------------

## 10. Core Workflow 4 -- Dynamic Mosque QR Check-in

### 10.1 Purpose

Mosques that opt into QR check-in can display a rotating QR code on a
tablet, computer, or screen inside the mosque.

### 10.2 Mosque Admin Flow

1.  Mosque Admin signs in.
2.  Selects an assigned mosque.
3.  Opens QR Check-in Display.
4.  Selects the active prayer session, if required.
5.  The portal requests a short-lived QR token from a protected server
    endpoint.
6.  The display refreshes the QR code every 60--90 seconds.
7.  A user scans it through the Flutter app's `mobile_scanner` screen.
8.  The backend validates the token and records the result for
    attendance evaluation.

### 10.3 QR Payload

Illustrative deep-link format:

``` text
salahnear://mosque/{id}?session={prayer}&ts={timestamp}&sig={hmac_signature}
```

The signature must be generated server-side using a secret that is never
shipped in the Flutter app or browser bundle.

### 10.4 QR Security

-   Use short expiry times.
-   Validate signature server-side.
-   Reject expired tokens.
-   Reject tokens for the wrong mosque or prayer session.
-   Prevent replay by tracking token/session use where appropriate.
-   Use secure transport.
-   Do not place private signing secrets in the QR payload.
-   Rate-limit token creation and validation endpoints.

A QR scan is a verification signal, not an automatic guarantee of
physical presence. Combine it with the application's attendance policy
and other risk checks.

### 10.5 Display Requirements

The QR display page should:

-   Show mosque name.
-   Show current prayer/session.
-   Display a large, high-contrast QR code.
-   Show token expiry or refresh countdown.
-   Refresh automatically.
-   Show a clear error if the token cannot be refreshed.
-   Provide a full-screen display mode.
-   Avoid exposing administrative navigation on a public display screen.

------------------------------------------------------------------------

## 11. Core Workflow 5 -- Points Moderation and Leaderboard Integrity

### 11.1 Points Ledger

Do not directly overwrite a user's points total to correct an error.

Use an append-only points ledger. Each award or deduction should create
a separate transaction.

Example:

  Transaction                     Points
  ----------------------------- --------
  Fajr attendance award              +10
  Dhuhr attendance award             +10
  Asr attendance award               +10
  Invalid attendance reversal        -10
  Net points                          20

The point values above are illustrative. Actual scoring must come from
the application's configured points policy.

### 11.2 Reversal Workflow

If fraudulent or invalid attendance is confirmed:

1.  Authorized reviewer investigates the evidence.
2.  The record is marked rejected or reversed according to the state
    transition rules.
3.  An authorized server-side operation creates a corrective ledger
    entry.
4.  The user's point balance is recalculated from ledger transactions.
5.  Streaks are recalculated according to the streak rules.
6.  Leaderboard data is refreshed.
7.  The reason and actor are written to the audit log.

Only Super Admin should have points-reversal permission by default. If
reviewers are allowed to initiate reversals, grant that permission
explicitly and consider requiring Super Admin approval for high-impact
corrections.

### 11.3 Leaderboard

The leaderboard should be derived from trusted server-side records, not
values submitted by the Flutter client.

Support:

-   Current period ranking
-   Monthly ranking
-   Previous month history
-   Unit-wise ranking, if the app uses units
-   Top performers
-   Tie-breaking rules
-   Reversal-aware totals

Document the tie-breaking policy and ensure it is applied consistently.

### 11.4 Streak Integrity

Recalculate streaks when an attendance record is reversed or corrected.
Do not allow the client to directly edit streak values.

------------------------------------------------------------------------

## 12. User Management

Super Admin and authorized Support Admins can access user management
according to their permissions.

Features:

-   Search users by permitted identifiers.
-   View account status.
-   View registration date.
-   View assigned unit or group, if applicable.
-   View relevant attendance and points history.
-   Suspend or reactivate accounts according to policy.
-   Initiate account recovery.
-   Review reported account issues.
-   View support history.

Sensitive personal data must be limited to administrators who need it.
Mask or omit unnecessary fields.

A Support Admin must not be able to change a user's points or attendance
status unless a separate permission is explicitly granted.

------------------------------------------------------------------------

## 13. Announcements and Mosque Events

### 13.1 Platform and State Announcements

Authorized administrators can create announcements for their permitted
scope:

-   Platform-wide: Super Admin
-   State-wide: State Admin, if enabled
-   District-level: District Admin, if enabled
-   Mosque-level: Mosque Admin, for assigned mosques

Each announcement should support:

-   Title
-   Body
-   Language, including Malayalam and English where needed
-   Audience/scope
-   Publish date
-   Expiry date
-   Draft/published/archived status
-   Optional push notification

### 13.2 Mosque Events

Mosque Admins can create local events for their assigned mosque(s).

Fields:

-   Event title
-   Description
-   Date and time
-   Venue
-   Optional image
-   Registration details, if applicable
-   Publication status

All publishing permissions must be scope-checked server-side.

------------------------------------------------------------------------

## 14. Support and Dispute Management

Support Admins should have a dedicated case-management area.

Suggested case categories:

-   Login and account recovery
-   Attendance dispute
-   Mosque information correction
-   Mock-location investigation
-   Points or leaderboard dispute
-   Friend or participation dispute
-   General technical issue

Each case should have:

-   Case ID
-   User reference
-   Category
-   Description
-   Attachments, if applicable
-   Assigned Support Admin
-   Status (`open`, `in_progress`, `waiting_for_user`, `resolved`,
    `closed`)
-   Internal notes
-   Resolution summary
-   Created and updated timestamps

Support Admins should not see private attendance evidence unless the
case and their permissions require it.

------------------------------------------------------------------------

## 15. Audit Logs and Administrative Accountability

### 15.1 Audit Log Requirements

Every sensitive administrative action must create an audit record in
`public.audit_logs`.

Examples:

-   Admin account created or deactivated
-   Role or scope changed
-   Mosque details edited
-   Mosque verified or rejected
-   Coordinates or geofence radius changed
-   Prayer timetable updated
-   Attendance approved, rejected, or reversed
-   Points correction created
-   Announcement published
-   Support case action performed
-   Global setting changed

### 15.2 Suggested Audit Fields

  Field             Purpose
  ----------------- --------------------------------------------
  `id`              Unique audit record
  `actor_user_id`   Authenticated administrator UUID
  `action`          Action name
  `entity_type`     Type of affected record
  `entity_id`       Affected record ID
  `before_state`    Previous JSON state
  `after_state`     New JSON state
  `reason`          Reason for sensitive change
  `ip_address`      Server-observed client IP, where available
  `user_agent`      Request metadata, where appropriate
  `created_at`      Server timestamp

Audit logs should be append-only for normal application roles.
Administrators must not be able to edit or delete audit history through
the portal.

Do not log passwords, access tokens, secret keys, or unnecessary
sensitive personal data.

### 15.3 Audit Log Viewer

Authorized admins can filter logs by:

-   Date range
-   Administrator
-   Action
-   Entity type
-   Entity ID
-   State/district/mosque scope

The viewer must respect the same access scope as the underlying records.

------------------------------------------------------------------------

## 16. Suggested Database Structure

The following is a recommended logical schema. Confirm and adapt names
to the existing database before implementation. Do not create duplicate
tables if equivalent tables already exist.

### 16.1 Core Tables

  Table                        Purpose
  ---------------------------- ------------------------------------------------------
  `profiles`                   User profile linked to Supabase Auth
  `user_roles`                 Administrative roles and scope assignments
  `states`                     State records
  `districts`                  District records
  `mosques`                    Mosque details, coordinates, and verification status
  `mosque_admin_assignments`   Mosque Admin-to-mosque assignments
  `prayer_schedules`           Versioned prayer and Iqamah schedules
  `attendance_verifications`   Attendance submission and review state
  `user_points`                Append-only points ledger
  `user_streaks`               Derived or maintained streak data
  `announcements`              Scoped announcements
  `mosque_events`              Local mosque events
  `support_cases`              User support and disputes
  `audit_logs`                 Administrative audit history

### 16.2 `user_roles`

Suggested fields:

-   `id`
-   `user_id`
-   `role`
-   `state_id` nullable
-   `district_id` nullable
-   `is_active`
-   `assigned_by`
-   `created_at`
-   `updated_at`

Use a constrained role value or a normalized role/permission design.
Validate that each role has the correct scope. For example, a District
Admin must have a district scope.

### 16.3 `mosques`

Suggested fields:

-   `id`
-   `name_en`
-   `name_ml`
-   `state_id`
-   `district_id`
-   `locality`
-   `address`
-   `latitude`
-   `longitude`
-   `location` (PostGIS geography/geometry as appropriate)
-   `entrance_location`
-   `attendance_radius_m`
-   `verification_status`
-   `verification_notes`
-   `qr_checkin_enabled`
-   `created_at`
-   `updated_at`

Use PostGIS spatial indexes for efficient distance queries.

### 16.4 `prayer_schedules`

Suggested fields:

-   `id`
-   `mosque_id`
-   `version`
-   `effective_from`
-   `effective_until` nullable
-   `fajr_start`
-   `fajr_iqamah`
-   `dhuhr_start`
-   `dhuhr_iqamah`
-   `asr_start`
-   `asr_iqamah`
-   `maghrib_start`
-   `maghrib_iqamah`
-   `isha_start`
-   `isha_iqamah`
-   `jummah_iqamah` nullable
-   `updated_by`
-   `change_reason`
-   `created_at`

Use a well-defined timezone policy. Store timestamps consistently and
interpret local prayer times using the mosque's timezone.

### 16.5 `attendance_verifications`

Suggested fields:

-   `id`
-   `user_id`
-   `mosque_id`
-   `prayer`
-   `attendance_date`
-   `device_timestamp`
-   `server_timestamp`
-   `latitude`
-   `longitude`
-   `gps_accuracy_m`
-   `distance_from_mosque_m`
-   `is_mocked`
-   `evidence_storage_path`
-   `evidence_sha256`
-   `status`
-   `risk_reasons`
-   `reviewed_by`
-   `reviewed_at`
-   `review_reason`
-   `created_at`

Avoid trusting client-calculated distance or client-supplied status.
Calculate or validate critical values on the server.

### 16.6 `user_points`

Suggested fields:

-   `id`
-   `user_id`
-   `source_type`
-   `source_id`
-   `points_delta`
-   `reason`
-   `created_by`
-   `created_at`

Use unique constraints or idempotency keys to prevent the same
attendance from awarding points multiple times.

### 16.7 `audit_logs`

Suggested fields:

-   `id`
-   `actor_user_id`
-   `action`
-   `entity_type`
-   `entity_id`
-   `before_state` JSONB
-   `after_state` JSONB
-   `reason`
-   `ip_address`
-   `user_agent`
-   `created_at`

Capture audit entries through trusted database triggers or protected
server-side functions. Do not rely on the browser to submit truthful
audit data.

------------------------------------------------------------------------

## 17. Row Level Security (RLS) and Backend Security

### 17.1 Mandatory Security Rules

-   Enable RLS on all tables exposed through the Supabase API.
-   Deny access by default.
-   Use the authenticated user's UUID to look up active role
    assignments.
-   Validate role and geographic/entity scope in database policies or
    trusted server-side functions.
-   Never trust role or scope values from request bodies.
-   Do not expose the Supabase service-role key to browsers or mobile
    clients.
-   Keep private evidence buckets private.
-   Generate signed URLs only after authorization.
-   Validate every privileged mutation on the server.
-   Rate-limit authentication and sensitive endpoints.
-   Use database constraints and transactions for critical state
    changes.

### 17.2 Privileged Operations

Operations such as role assignment, attendance reversal, points
correction, QR signature generation, and sensitive audit writes should
run through protected server-side code or carefully secured database
functions.

The server must verify:

1.  The user is authenticated.
2.  The account is active.
3.  The user has the required role.
4.  The role has the correct scope.
5.  The requested entity belongs to that scope.
6.  The requested state transition is valid.

### 17.3 Audit IP Address

Capture IP information at a trusted server boundary or trusted proxy. Do
not trust an arbitrary IP address supplied in the browser request.

------------------------------------------------------------------------

## 18. Notifications and Synchronization

Admin actions may trigger notifications:

  -----------------------------------------------------------------------
  Admin action                        Expected system response
  ----------------------------------- -----------------------------------
  Prayer timetable updated            Notify/sync affected clients to
                                      refresh schedules and alarms

  New announcement published          Notify the selected audience

  Mosque event published              Notify relevant users if enabled

  Attendance review completed         Update attendance state and points
                                      if approved

  Points reversed                     Refresh points, streak, and
                                      leaderboard data

  Mosque details corrected            Refresh relevant mosque information
  -----------------------------------------------------------------------

Use FCM for push notifications where appropriate. The database remains
the source of truth; mobile clients must refresh data even if a push
notification is missed.

------------------------------------------------------------------------

## 19. Validation, Errors, and UX Requirements

Every admin page must include:

-   Loading state
-   Empty state
-   Error state with a safe, useful message
-   Success confirmation
-   Form validation
-   Confirmation dialog for destructive or high-impact actions
-   Permission-denied handling
-   Responsive layout
-   Search, sorting, and pagination for large lists
-   Clear timestamps and timezone display

For sensitive actions, require a reason and show the affected entity
before confirmation.

Never show raw database errors, secret values, or stack traces to
administrators.

------------------------------------------------------------------------

## 20. Recommended Next.js Route Structure

Example App Router structure:

``` text
app/
  (auth)/
    login/
      page.tsx
    forgot-password/
      page.tsx
    reset-password/
      page.tsx

  (admin)/
    layout.tsx
    dashboard/
      page.tsx

    administrators/
      page.tsx
      [id]/
        page.tsx

    roles/
      page.tsx

    states/
      page.tsx

    districts/
      page.tsx

    mosques/
      page.tsx
      new/
        page.tsx
      [id]/
        page.tsx

    prayer-schedules/
      page.tsx
      [mosqueId]/
        page.tsx

    attendance/
      page.tsx
      [id]/
        page.tsx

    qr-display/
      [mosqueId]/
        page.tsx

    users/
      page.tsx
      [id]/
        page.tsx

    points/
      page.tsx
      leaderboard/
        page.tsx

    announcements/
      page.tsx

    events/
      page.tsx

    support/
      page.tsx
      [caseId]/
        page.tsx

    audit-logs/
      page.tsx

    settings/
      page.tsx
```

This is a suggested structure. Actual route access must be checked on
the server, not merely by hiding navigation items.

------------------------------------------------------------------------

## 21. Recommended Implementation Phases

### Phase 1 -- Foundation and Authentication

-   Create Next.js Admin Portal.
-   Configure Supabase Auth.
-   Build login, logout, password recovery, and session handling.
-   Create administrator profiles and role assignments.
-   Implement RLS and protected server-side authorization.
-   Create separate Super Admin and Mosque Admin dashboards.
-   Allow Super Admin to create and manage subordinate admin roles.

### Phase 2 -- Mosque Management

-   Build state and district management.
-   Integrate OSM staging/import process.
-   Build mosque list, map, details, and verification workflow.
-   Add mosque admin assignments.
-   Add geofence configuration.

### Phase 3 -- Prayer Timetable Management

-   Build timetable editor.
-   Add start time and Iqamah time fields separately.
-   Add versioning and history.
-   Trigger mobile schedule synchronization.

### Phase 4 -- Attendance Review

-   Build flagged attendance queue.
-   Add risk signals and filters.
-   Add secure evidence preview using signed URLs.
-   Implement reviewer decisions and review history.

### Phase 5 -- QR Check-in

-   Implement server-side short-lived QR token generation.
-   Build mosque QR display mode.
-   Integrate Flutter QR scanning.
-   Validate QR tokens server-side and prevent replay.

### Phase 6 -- Points and Leaderboard Integrity

-   Implement append-only points ledger.
-   Add authorized reversal workflow.
-   Recalculate streaks and leaderboard from trusted data.
-   Add idempotency and transaction safeguards.

### Phase 7 -- Support, Announcements, and Audit

-   Build support case management.
-   Build scoped announcements and mosque events.
-   Complete audit log capture and viewer.
-   Add monitoring and operational alerts.

### Phase 8 -- Testing and Release

-   Test every role against allowed and denied actions.
-   Test RLS using real authenticated test accounts.
-   Test cross-district and cross-mosque access denial.
-   Test account suspension and role revocation.
-   Test timetable versioning and mobile synchronization.
-   Test QR expiry, invalid signatures, and replay attempts.
-   Test attendance review and points reversal transactions.
-   Perform security review before production deployment.

------------------------------------------------------------------------

## 22. Acceptance Criteria

The Admin Portal is ready for release only when all of the following are
satisfied:

### Authentication and Roles

-   [ ] Admins can sign in securely through Supabase Auth.
-   [ ] Super Admin and Mosque Admin experiences are separated by
    server-verified permissions.
-   [ ] Super Admin can create, assign, suspend, and deactivate State
    Admins, District Admins, Attendance Reviewers, Support Admins, and
    Mosque Admins.
-   [ ] Subordinate admins cannot assign themselves higher privileges.
-   [ ] Suspended or deactivated admins cannot perform privileged
    operations.
-   [ ] Password recovery works securely.

### Scope and Security

-   [ ] District Admins cannot modify another district's data.
-   [ ] Mosque Admins can only manage assigned mosques.
-   [ ] Reviewers can only access their permitted review queue.
-   [ ] Support Admins cannot perform unauthorized points or attendance
    changes.
-   [ ] RLS protects database records even when requests bypass the UI.
-   [ ] Service-role secrets are never exposed to client applications.

### Mosque and Timetable

-   [ ] Imported mosques enter a staging state.
-   [ ] Authorized District Admins can verify and correct mosque
    records.
-   [ ] Mosque geofence radius is configurable.
-   [ ] Mosque Admins can update permitted prayer and Iqamah times.
-   [ ] Timetable changes preserve history and increment versions.
-   [ ] Mobile clients can refresh updated schedules.

### Attendance and QR

-   [ ] Suspicious attendance enters a review queue.
-   [ ] Reviewers can inspect authorized evidence through short-lived
    signed URLs.
-   [ ] Review decisions and reasons are recorded.
-   [ ] QR tokens are signed server-side and expire.
-   [ ] Expired, invalid, or replayed QR tokens are rejected.

### Points and Audit

-   [ ] Points awards and deductions are recorded in a ledger.
-   [ ] Reversals are authorized, reasoned, and auditable.
-   [ ] Streaks and leaderboard values update after corrections.
-   [ ] Sensitive admin actions create audit log records.
-   [ ] Normal administrators cannot edit or delete audit history.

------------------------------------------------------------------------

## 23. Important Implementation Notes

1.  This document is the functional and technical specification for the
    Admin Portal. It does not replace a security review or production
    database migration review.
2.  Before creating tables, inspect the existing Supabase schema and
    reuse compatible tables. Avoid duplicate or conflicting schemas.
3.  Treat all client-submitted values as untrusted. Validate
    permissions, location calculations, QR signatures, attendance
    decisions, and points changes on trusted backend components.
4.  Keep the admin portal separate from the Flutter app, but use shared
    backend services with strictly scoped permissions.
5.  Do not assume that hiding a menu item or button provides security.
6.  Use database transactions for operations that must update
    attendance, points, streaks, and leaderboard data consistently.
7.  Keep a clear distinction between prayer start time and
    mosque-announced Iqamah time.
8.  Make scoring, geofence thresholds, review rules, and notification
    behavior configurable where appropriate.
9.  Test with separate accounts for every role, including negative tests
    proving that unauthorized actions are blocked.
10. Implement the portal in phases, but preserve the complete role and
    security architecture from the beginning.

------------------------------------------------------------------------

## 24. Final System Summary

The SalahNear Admin Portal is the central control system for the
application.

-   **Super Admin** controls the platform and manages all subordinate
    administrative roles.
-   **State Admin** oversees state-level activity.
-   **District Admin** verifies and manages mosques within the assigned
    district.
-   **Mosque Admin** manages assigned mosque information, Iqamah
    schedules, QR display, and local events.
-   **Attendance Reviewer** reviews suspicious attendance submissions.
-   **Support Admin** handles user support and disputes.

The Flutter app remains focused on the member experience. The Next.js
Admin Portal handles administration, while Supabase Auth, PostgreSQL,
PostGIS, RLS, protected server operations, and audit logs enforce the
security and integrity of the complete system.
