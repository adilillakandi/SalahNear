import 'package:salah_near/core/constants/prayer_names.dart';
import 'package:salah_near/features/prayer_times/domain/entities/prayer_time_entry.dart';

class DailyPrayerSchedule {
  final DateTime date;
  final List<PrayerTimeEntry> prayers;
  final DateTime? sunrise;
  final String locationName;

  const DailyPrayerSchedule({
    required this.date,
    required this.prayers,
    this.sunrise,
    this.locationName = 'Kerala, India',
  });

  PrayerTimeEntry? get nextPrayer {
    try {
      return prayers.firstWhere((p) => p.isNext);
    } catch (_) {
      return null;
    }
  }

  PrayerTimeEntry? get currentPrayer {
    try {
      return prayers.firstWhere((p) => p.isCurrent);
    } catch (_) {
      return null;
    }
  }

  PrayerTimeEntry? getPrayer(PrayerType type) {
    try {
      return prayers.firstWhere((p) => p.type == type);
    } catch (_) {
      return null;
    }
  }
}
