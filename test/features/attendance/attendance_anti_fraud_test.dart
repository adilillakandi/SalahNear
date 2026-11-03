import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:salah_near/core/utils/image_utils.dart';
import 'package:salah_near/core/constants/prayer_names.dart';
import 'package:salah_near/features/attendance/data/repositories/attendance_repository_impl.dart';
import 'package:salah_near/features/attendance/domain/entities/attendance_submission.dart';

void main() {
  group('Anti-Fraud & Attendance Tests', () {
    test('ImageUtils calculates consistent SHA-256 hash for photo deduplication', () {
      final sampleBytes = Uint8List.fromList([1, 2, 3, 4, 5, 42, 99]);
      final hash1 = ImageUtils.calculateSha256(sampleBytes);
      final hash2 = ImageUtils.calculateSha256(sampleBytes);

      expect(hash1, equals(hash2));
      expect(hash1.length, 64); // SHA-256 is 64 hex characters
    });

    test('Awards 5 community points per verified congregational prayer', () async {
      final repo = AttendanceRepositoryImpl(supabaseClient: null);
      final submission = AttendanceSubmission(
        mosqueId: '1',
        mosqueName: 'Mishkal Mosque',
        prayerType: PrayerType.fajr,
        prayerDate: DateTime.now(),
        latitude: 11.2425,
        longitude: 75.7766,
        accuracyMeters: 15.0,
        idempotencyKey: 'test-key-1',
        submittedAt: DateTime.now(),
      );

      final result = await repo.submitAttendance(submission: submission);

      expect(result.status, AttendanceStatus.verified);
      expect(result.pointsAwarded, 5); // 5 points per prayer as per guide
    });
  });
}
