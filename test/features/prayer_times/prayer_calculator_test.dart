import 'package:flutter_test/flutter_test.dart';
import 'package:salah_near/core/constants/app_constants.dart';
import 'package:salah_near/core/constants/prayer_names.dart';
import 'package:salah_near/features/prayer_times/domain/services/prayer_calculator_service.dart';

void main() {
  group('PrayerCalculatorService Tests', () {
    late PrayerCalculatorService calculator;

    setUp(() {
      calculator = PrayerCalculatorService();
    });

    test('calculates 5 daily prayer times for Kerala coordinates', () {
      final date = DateTime(2026, 11, 3);
      final schedule = calculator.calculateDailySchedule(
        latitude: AppConstants.defaultKeralaLatitude,
        longitude: AppConstants.defaultKeralaLongitude,
        date: date,
      );

      expect(schedule.prayers.length, 5);
      expect(schedule.prayers.map((p) => p.type).toList(), [
        PrayerType.fajr,
        PrayerType.dhuhr,
        PrayerType.asr,
        PrayerType.maghrib,
        PrayerType.isha,
      ]);

      // Verify chronological ordering
      final fajr = schedule.getPrayer(PrayerType.fajr)!.startTime;
      final dhuhr = schedule.getPrayer(PrayerType.dhuhr)!.startTime;
      final asr = schedule.getPrayer(PrayerType.asr)!.startTime;
      final maghrib = schedule.getPrayer(PrayerType.maghrib)!.startTime;
      final isha = schedule.getPrayer(PrayerType.isha)!.startTime;

      expect(fajr.isBefore(dhuhr), isTrue);
      expect(dhuhr.isBefore(asr), isTrue);
      expect(asr.isBefore(maghrib), isTrue);
      expect(maghrib.isBefore(isha), isTrue);
    });
  });
}

