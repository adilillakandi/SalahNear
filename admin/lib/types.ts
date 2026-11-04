export type AdminRole =
  | 'super_admin'
  | 'state_admin'
  | 'district_admin'
  | 'mosque_admin'
  | 'attendance_reviewer'
  | 'support_admin';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  state?: string;
  district?: string;
  assigned_mosques?: string[]; // Mosque IDs
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string;
}

export interface Mosque {
  id: string;
  name: string;
  alternate_name?: string | null;
  name_ml?: string | null;
  address?: string | null;
  city_or_locality?: string | null;
  district: string;
  state: string;
  verification_status:
    | 'pending'
    | 'under_review'
    | 'verified'
    | 'rejected'
    | 'needs_correction'
    | 'archived'
    | 'inactive';
  attendance_radius_m: number;
  entrance_latitude?: number;
  entrance_longitude?: number;
  qr_checkin_enabled: boolean;
  verification_notes?: string | null;
  is_active: boolean;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at?: string;
}

export interface AttendanceReviewItem {
  id: string;
  user_id: string;
  user_name: string;
  user_username?: string;
  mosque_id: string;
  mosque_name: string;
  prayer_type: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  prayer_date: string;
  submitted_at: string;
  status: 'pending' | 'verified' | 'flagged' | 'rejected' | 'reversed';
  points_awarded: number;
  device_accuracy_m?: number;
  calculated_distance_m?: number;
  image_storage_path?: string | null;
  image_sha256?: string | null;
  is_mock_location?: boolean;
  risk_reasons?: string[];
  reviewed_by?: string;
  reviewed_at?: string;
  review_reason?: string;
}

export interface PrayerScheduleItem {
  id: string;
  mosque_id: string;
  mosque_name?: string;
  prayer_date: string;
  effective_from?: string;
  effective_until?: string | null;
  fajr_start: string;
  dhuhr_start: string;
  asr_start: string;
  maghrib_start: string;
  isha_start: string;
  fajr_iqamah?: string;
  dhuhr_iqamah?: string;
  asr_iqamah?: string;
  maghrib_iqamah?: string;
  isha_iqamah?: string;
  jummah_iqamah?: string;
  source_type: string;
  version: number;
  change_reason?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  language: 'en' | 'ml' | 'both';
  scope_type: 'platform' | 'state' | 'district' | 'mosque';
  scope_target?: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  expires_at?: string | null;
  send_push: boolean;
  author_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface MosqueEvent {
  id: string;
  mosque_id: string;
  mosque_name?: string;
  title: string;
  description?: string | null;
  event_date: string;
  venue?: string | null;
  image_url?: string | null;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  created_by?: string;
  created_at: string;
}

export interface SupportCase {
  id: string;
  user_id?: string;
  user_name: string;
  user_email?: string;
  category:
    | 'account_recovery'
    | 'attendance_dispute'
    | 'mosque_correction'
    | 'mock_location'
    | 'points_dispute'
    | 'friend_dispute'
    | 'general';
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
  assigned_to?: string;
  internal_notes?: string | null;
  resolution_summary?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AuditLogItem {
  id: string;
  actor_user_id?: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  target_table?: string;
  target_id?: string;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  changes?: Record<string, unknown>;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
