import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/core/constants/prayer_names.dart';
import 'package:salah_near/core/network/supabase_client_provider.dart';
import 'package:salah_near/core/services/location_service.dart';
import 'package:salah_near/features/prayer_times/presentation/providers/prayer_times_provider.dart';
import 'package:salah_near/features/attendance/domain/entities/attendance_submission.dart';
import 'package:salah_near/features/attendance/domain/repositories/attendance_repository.dart';
import 'package:salah_near/features/attendance/data/repositories/attendance_repository_impl.dart';

final attendanceRepositoryProvider = Provider<AttendanceRepository>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  return AttendanceRepositoryImpl(supabaseClient: supabase);
});

// Selected prayer for check-in
final selectedCheckInPrayerProvider = StateProvider<PrayerType>((ref) {
  final schedule = ref.watch(dailyPrayerScheduleProvider).value;
  return schedule?.currentPrayer?.type ??
      schedule?.nextPrayer?.type ??
      PrayerType.fajr;
});

// Attendance History Provider
final userAttendanceHistoryProvider =
    FutureProvider<List<AttendanceSubmission>>((ref) async {
  final repo = ref.watch(attendanceRepositoryProvider);
  return repo.getUserAttendanceHistory();
});

// Attendance Submission State Notifier
class AttendanceSubmissionNotifier
    extends StateNotifier<AsyncValue<AttendanceSubmission?>> {
  final AttendanceRepository repository;
  final LocationService locationService;

  AttendanceSubmissionNotifier({
    required this.repository,
    required this.locationService,
  }) : super(const AsyncValue.data(null));

  Future<bool> submitCheckIn({
    required String mosqueId,
    required String mosqueName,
    required PrayerType prayerType,
    File? evidencePhoto,
    String? qrCode,
  }) async {
    state = const AsyncValue.loading();
    try {
      final position = await locationService.getCurrentLocation();
      final idempotencyKey =
          '${prayerType.name}-${DateTime.now().toIso8601String()}';

      final submission = AttendanceSubmission(
        mosqueId: mosqueId,
        mosqueName: mosqueName,
        prayerType: prayerType,
        prayerDate: DateTime.now(),
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy,
        idempotencyKey: idempotencyKey,
        qrPayload: qrCode,
        submittedAt: DateTime.now(),
      );

      final result = await repository.submitAttendance(
        submission: submission,
        evidencePhoto: evidencePhoto,
      );

      state = AsyncValue.data(result);
      return true;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      return false;
    }
  }
}

final attendanceSubmissionNotifierProvider = StateNotifierProvider<
    AttendanceSubmissionNotifier, AsyncValue<AttendanceSubmission?>>((ref) {
  final repo = ref.watch(attendanceRepositoryProvider);
  final locationService = ref.watch(locationServiceProvider);
  return AttendanceSubmissionNotifier(
    repository: repo,
    locationService: locationService,
  );
});
