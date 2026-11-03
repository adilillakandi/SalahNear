import 'package:salah_near/core/constants/prayer_names.dart';

enum AttendanceStatus {
  pending,
  verified,
  flagged,
  rejected;

  String get displayName {
    switch (this) {
      case AttendanceStatus.pending:
        return 'Under Review';
      case AttendanceStatus.verified:
        return 'Verified';
      case AttendanceStatus.flagged:
        return 'Suspicious';
      case AttendanceStatus.rejected:
        return 'Rejected';
    }
  }
}

class AttendanceSubmission {
  final String? id;
  final String mosqueId;
  final String mosqueName;
  final PrayerType prayerType;
  final DateTime prayerDate;
  final double latitude;
  final double longitude;
  final double accuracyMeters;
  final String? imageEvidencePath;
  final String? qrPayload;
  final String idempotencyKey;
  final AttendanceStatus status;
  final int pointsAwarded;
  final DateTime submittedAt;

  const AttendanceSubmission({
    this.id,
    required this.mosqueId,
    required this.mosqueName,
    required this.prayerType,
    required this.prayerDate,
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    this.imageEvidencePath,
    this.qrPayload,
    required this.idempotencyKey,
    this.status = AttendanceStatus.pending,
    this.pointsAwarded = 0,
    required this.submittedAt,
  });
}
