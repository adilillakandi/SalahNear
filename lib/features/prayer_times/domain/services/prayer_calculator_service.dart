import 'package:adhan_dart/adhan_dart.dart' as adhan;
import 'package:salah_near/core/constants/prayer_names.dart';
import 'package:salah_near/features/prayer_times/domain/entities/prayer_schedule.dart';
import 'package:salah_near/features/prayer_times/domain/entities/prayer_time_entry.dart';

class PrayerCalculatorService {
  DailyPrayerSchedule calculateDailySchedule({
    required double latitude,
    required double longitude,
    required DateTime date,
    String? locationName,
    Map<PrayerType, DateTime?>? mosqueIqamahOverrides,
  }) {
    final coordinates = adhan.Coordinates(latitude, longitude);

    // Standard calculation method for Indian subcontinent / MWL
    final params = adhan.CalculationMethodParameters.muslimWorldLeague();
    // Shafi'i madhab is predominant in Kerala
    params.madhab = adhan.Madhab.shafi;

    final adhanTimes = adhan.PrayerTimes(
      date: date,
      coordinates: coordinates,
      calculationParameters: params,
      precision: true,
    );

    final now = DateTime.now();

    final fajr = adhanTimes.fajr;
    final dhuhr = adhanTimes.dhuhr;
    final asr = adhanTimes.asr;
    final maghrib = adhanTimes.maghrib;
    final isha = adhanTimes.isha;

    final rawEntries = [
      (PrayerType.fajr, fajr),
      (PrayerType.dhuhr, dhuhr),
      (PrayerType.asr, asr),
      (PrayerType.maghrib, maghrib),
      (PrayerType.isha, isha),
    ];

    // Determine current and next prayer
    PrayerType? nextType;
    PrayerType? currentType;

    for (int i = 0; i < rawEntries.length; i++) {
      final prayer = rawEntries[i];
      if (now.isBefore(prayer.$2)) {
        nextType = prayer.$1;
        if (i > 0) {
          currentType = rawEntries[i - 1].$1;
        } else {
          // Before Fajr: current prayer was yesterday's Isha
          currentType = PrayerType.isha;
        }
        break;
      }
    }

    // If after Isha
    if (nextType == null) {
      currentType = PrayerType.isha;
      nextType = PrayerType.fajr; // Next morning's Fajr
    }

    final prayerEntries = rawEntries.map((entry) {
      final type = entry.$1;
      final startTime = entry.$2;
      final iqamah = mosqueIqamahOverrides?[type];

      return PrayerTimeEntry(
        type: type,
        startTime: startTime,
        iqamahTime: iqamah,
        isNext: type == nextType,
        isCurrent: type == currentType,
      );
    }).toList();

    return DailyPrayerSchedule(
      date: date,
      prayers: prayerEntries,
      sunrise: adhanTimes.sunrise,
      locationName: locationName ?? 'Kerala, India',
    );
  }
}
