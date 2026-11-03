import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:salah_near/core/constants/prayer_names.dart';
import 'package:salah_near/core/utils/logger.dart';
import 'package:salah_near/features/attendance/domain/entities/attendance_submission.dart';
import 'package:salah_near/features/attendance/domain/repositories/attendance_repository.dart';

class AttendanceRepositoryImpl implements AttendanceRepository {
  final SupabaseClient? supabaseClient;

  AttendanceRepositoryImpl({this.supabaseClient});

  @override
  Future<AttendanceSubmission> submitAttendance({
    required AttendanceSubmission submission,
    File? evidencePhoto,
  }) async {
    final client = supabaseClient;
    if (client == null) {
      // Local demo mode simulation
      AppLogger.info('Submitting attendance in offline demo mode.');
      return AttendanceSubmission(
        id: 'demo-${DateTime.now().millisecondsSinceEpoch}',
        mosqueId: submission.mosqueId,
        mosqueName: submission.mosqueName,
        prayerType: submission.prayerType,
        prayerDate: submission.prayerDate,
        latitude: submission.latitude,
        longitude: submission.longitude,
        accuracyMeters: submission.accuracyMeters,
        imageEvidencePath: evidencePhoto?.path,
        qrPayload: submission.qrPayload,
        idempotencyKey: submission.idempotencyKey,
        status: AttendanceStatus.verified,
        pointsAwarded: submission.prayerType.basePoints,
        submittedAt: DateTime.now(),
      );
    }

    try {
      final user = client.auth.currentUser;
      if (user == null) {
        throw Exception('User is not authenticated');
      }

      String? uploadedImageUrl;

      // 1. Upload private photo evidence to Supabase Storage if present
      if (evidencePhoto != null) {
        final fileExt = evidencePhoto.path.split('.').last;
        final fileName =
            '${user.id}/${DateTime.now().millisecondsSinceEpoch}.$fileExt';
        await client.storage
            .from('attendance-evidence')
            .upload(fileName, evidencePhoto);
        uploadedImageUrl = fileName;
      }

      // 2. Submit record to attendance table
      final dateStr =
          "${submission.prayerDate.year}-${submission.prayerDate.month.toString().padLeft(2, '0')}-${submission.prayerDate.day.toString().padLeft(2, '0')}";

      final response = await client
          .from('attendance')
          .insert({
            'user_id': user.id,
            'mosque_id': submission.mosqueId,
            'prayer_type': submission.prayerType.name,
            'prayer_date': dateStr,
            'status': 'pending',
            'idempotency_key': submission.idempotencyKey,
          })
          .select()
          .single();

      final attendanceId = response['id'] as String;

      // 3. Insert evidence record
      await client.from('attendance_evidence').insert({
        'attendance_id': attendanceId,
        'image_storage_path': uploadedImageUrl,
        'device_latitude': submission.latitude,
        'device_longitude': submission.longitude,
        'device_accuracy_m': submission.accuracyMeters,
        'qr_payload': submission.qrPayload,
      });

      return AttendanceSubmission(
        id: attendanceId,
        mosqueId: submission.mosqueId,
        mosqueName: submission.mosqueName,
        prayerType: submission.prayerType,
        prayerDate: submission.prayerDate,
        latitude: submission.latitude,
        longitude: submission.longitude,
        accuracyMeters: submission.accuracyMeters,
        imageEvidencePath: uploadedImageUrl,
        qrPayload: submission.qrPayload,
        idempotencyKey: submission.idempotencyKey,
        status: AttendanceStatus.pending,
        pointsAwarded: 0,
        submittedAt: DateTime.now(),
      );
    } catch (e, stack) {
      AppLogger.error('Failed to submit attendance', error: e, stackTrace: stack);
      rethrow;
    }
  }

  @override
  Future<List<AttendanceSubmission>> getUserAttendanceHistory({
    int limit = 30,
    int offset = 0,
  }) async {
    final client = supabaseClient;
    if (client == null) {
      // Demo mock history
      return [
        AttendanceSubmission(
          id: 'demo-1',
          mosqueId: '1',
          mosqueName: 'Mishkal Mosque, Calicut',
          prayerType: PrayerType.fajr,
          prayerDate: DateTime.now(),
          latitude: 11.2425,
          longitude: 75.7766,
          accuracyMeters: 12.0,
          idempotencyKey: 'demo-key-1',
          status: AttendanceStatus.verified,
          pointsAwarded: 25,
          submittedAt: DateTime.now().subtract(const Duration(hours: 4)),
        ),
      ];
    }

    try {
      final user = client.auth.currentUser;
      if (user == null) return [];

      final data = await client
          .from('attendance')
          .select('*, mosques(name)')
          .eq('user_id', user.id)
          .order('submitted_at', ascending: false)
          .range(offset, offset + limit - 1) as List<dynamic>;

      return data.map((json) {
        final mosqueObj = json['mosques'] as Map<String, dynamic>?;
        final mosqueName = mosqueObj?['name'] as String? ?? 'Local Mosque';
        final prayerType =
            PrayerType.fromString(json['prayer_type']) ?? PrayerType.fajr;

        return AttendanceSubmission(
          id: json['id'] as String,
          mosqueId: json['mosque_id'] as String,
          mosqueName: mosqueName,
          prayerType: prayerType,
          prayerDate: DateTime.parse(json['prayer_date'] as String),
          latitude: 0.0,
          longitude: 0.0,
          accuracyMeters: 0.0,
          idempotencyKey: json['idempotency_key'] as String? ?? '',
          status: _parseStatus(json['status'] as String?),
          pointsAwarded: (json['points_awarded'] as num?)?.toInt() ?? 0,
          submittedAt: DateTime.parse(json['submitted_at'] as String),
        );
      }).toList();
    } catch (e, stack) {
      AppLogger.error('Failed to get attendance history', error: e, stackTrace: stack);
      return [];
    }
  }

  @override
  Future<bool> hasAlreadyCheckedIn({
    required String prayerType,
    required DateTime date,
  }) async {
    final client = supabaseClient;
    if (client == null) return false;
    try {
      final user = client.auth.currentUser;
      if (user == null) return false;

      final dateStr =
          "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";

      final existing = await client
          .from('attendance')
          .select('id')
          .eq('user_id', user.id)
          .eq('prayer_type', prayerType)
          .eq('prayer_date', dateStr)
          .maybeSingle();

      return existing != null;
    } catch (_) {
      return false;
    }
  }

  AttendanceStatus _parseStatus(String? status) {
    switch (status?.toLowerCase()) {
      case 'verified':
        return AttendanceStatus.verified;
      case 'flagged':
        return AttendanceStatus.flagged;
      case 'rejected':
        return AttendanceStatus.rejected;
      default:
        return AttendanceStatus.pending;
    }
  }
}
