import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:salah_near/core/constants/prayer_names.dart';
import 'package:salah_near/core/utils/logger.dart';
import 'package:salah_near/features/prayer_times/domain/entities/prayer_schedule.dart';
import 'package:salah_near/features/prayer_times/domain/repositories/prayer_times_repository.dart';
import 'package:salah_near/features/prayer_times/domain/services/prayer_calculator_service.dart';

class PrayerTimesRepositoryImpl implements PrayerTimesRepository {
  final PrayerCalculatorService calculatorService;
  final SupabaseClient? supabaseClient;

  PrayerTimesRepositoryImpl({
    PrayerCalculatorService? calculatorService,
    this.supabaseClient,
  }) : calculatorService = calculatorService ?? PrayerCalculatorService();

  @override
  Future<DailyPrayerSchedule> getDailyPrayerSchedule({
    required double latitude,
    required double longitude,
    required DateTime date,
    String? mosqueId,
  }) async {
    Map<PrayerType, DateTime?>? iqamahOverrides;

    if (mosqueId != null && supabaseClient != null) {
      iqamahOverrides = await getMosqueIqamahTimes(
        mosqueId: mosqueId,
        date: date,
      );
    }

    return calculatorService.calculateDailySchedule(
      latitude: latitude,
      longitude: longitude,
      date: date,
      mosqueIqamahOverrides: iqamahOverrides,
    );
  }

  @override
  Future<Map<PrayerType, DateTime?>> getMosqueIqamahTimes({
    required String mosqueId,
    required DateTime date,
  }) async {
    final Map<PrayerType, DateTime?> result = {};
    final client = supabaseClient;
    if (client == null) return result;

    try {
      final dateStr =
          "${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}";
      final response = await client
          .from('prayer_schedules')
          .select()
          .eq('mosque_id', mosqueId)
          .eq('prayer_date', dateStr)
          .maybeSingle();

      if (response != null) {
        // Parse iqamah times if present
        for (final prayer in PrayerType.values) {
          final iqamahField = '${prayer.name}_iqamah';
          final timeStr = response[iqamahField] as String?;
          if (timeStr != null) {
            final parts = timeStr.split(':');
            if (parts.length >= 2) {
              final hour = int.parse(parts[0]);
              final minute = int.parse(parts[1]);
              result[prayer] = DateTime(
                date.year,
                date.month,
                date.day,
                hour,
                minute,
              );
            }
          }
        }
      }
    } catch (e, stack) {
      AppLogger.error('Failed to fetch mosque iqamah schedule', error: e, stackTrace: stack);
    }

    return result;
  }
}
