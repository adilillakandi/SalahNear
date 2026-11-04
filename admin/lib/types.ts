export interface Mosque {
  id: string;
  name: string;
  alternate_name?: string | null;
  address?: string | null;
  city_or_locality?: string | null;
  district: string;
  state: string;
  verification_status: 'pending' | 'under_review' | 'verified' | 'rejected' | 'inactive';
  attendance_radius_m: number;
  is_active: boolean;
  latitude?: number;
  longitude?: number;
  created_at: string;
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
  status: 'pending' | 'verified' | 'flagged' | 'rejected';
  points_awarded: number;
  device_accuracy_m?: number;
  calculated_distance_m?: number;
  image_storage_path?: string | null;
  is_mock_location?: boolean;
}

export interface PrayerScheduleItem {
  id: string;
  mosque_id: string;
  mosque_name?: string;
  prayer_date: string;
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
  source_type: string;
  version: number;
}

export interface AuditLogItem {
  id: string;
  actor_name: string;
  action: string;
  target_table: string;
  target_id?: string;
  changes?: Record<string, unknown>;
  created_at: string;
}
