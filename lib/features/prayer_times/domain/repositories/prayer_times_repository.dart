import 'package:salah_near/core/constants/prayer_names.dart';
import 'package:salah_near/features/prayer_times/domain/entities/prayer_schedule.dart';

abstract class PrayerTimesRepository {
  Future<DailyPrayerSchedule> getDailyPrayerSchedule({
    required double latitude,
    required double longitude,
    required DateTime date,
    String? mosqueId,
  });

  Future<Map<PrayerType, DateTime?>> getMosqueIqamahTimes({
    required String mosqueId,
    required DateTime date,
  });
}
