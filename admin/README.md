# SalahNear — Web Admin Dashboard

A web administration portal for the **SalahNear** Kerala Mosque and Gamified Congregational Prayer platform, built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

---

## 🕌 Overview & Features

The dashboard implements all 15 administrative modules mandated by `flutter_prayer_mosque_gamification_integration_guide.md` (Section 15):

1. **Dashboard Overview (`/`)**:
   - Statewide Kerala KPIs (Active Mosques, Today's Verified Prayers, Flagged Submissions, Active Congregants).
   - Kerala 14-District mosque coverage breakdown.
   - Quick action shortcuts.

2. **Mosque Directory & Registration Approvals (`/mosques`)**:
   - Filter by all 14 Kerala districts and verification status (`verified`, `pending`, `under_review`, `rejected`).
   - Coordinate calibration (Latitude & Longitude).
   - Geofence radius slider (30m – 200m).
   - Mosque Administrator assignment linked to `public.mosque_admins`.

3. **Attendance Review Queue & Anti-Fraud Queue (`/attendance`)**:
   - Comprehensive telemetry inspection: Distance from mosque center, device GPS accuracy (±m), and Mock GPS spoof detection flag (`is_mock_location`).
   - Camera proof inspection with SHA-256 validation badge.
   - 1-click decisions: "Approve (+5 pts)", "Reject Proof", "Flag as Suspicious" with mandatory review notes recorded into `public.attendance_verifications` and `public.user_points`.

4. **Iqamah Timetable Management (`/schedules`)**:
   - 5 daily prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha) + Friday Jummah congregation.
   - Version tracking with timestamps.
   - 15-minute post-Iqamah verification window synchronization.

5. **Live Mosque Dynamic QR Display (`/qr`)**:
   - High-contrast kiosk mode designed for entrance screens and smart TVs.
   - 60-second rotating signed security token (`salahnear://mosque/<id>?session=<prayer>&ts=<ts>&sig=<sig>`) to eliminate static screenshot sharing.
   - Live countdown progress bar and fullscreen kiosk toggle.

6. **User Management & Moderation (`/users`)**:
   - Congregant search across all districts.
   - Prayer streaks and points ledger monitoring.
   - Points Adjustment Modal with mandatory reason logging (for bonus rewards or anti-spoof penalties).
   - Role-Based Access Control (RBAC) assignment (`congregant`, `mosque_admin`, `attendance_reviewer`, `super_admin`).
   - Mutual friend prayer encounters moderation.

7. **Audit & Compliance Logs (`/audit`)**:
   - Immutable audit trail of administrative overrides, points transactions, schedule publications, and role grants.
   - Formatted JSON payload inspector.
   - 1-click CSV export.

---

## 🚀 Getting Started

### 1. Requirements
- Node.js 18+ (tested on Node.js 20 & 26)
- npm or yarn

### 2. Environment Variables
Stored in `admin/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://vopcihpgfqborlwwimyx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Run Development Server
```bash
cd admin
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build
```bash
cd admin
npm run build
npm start
```
