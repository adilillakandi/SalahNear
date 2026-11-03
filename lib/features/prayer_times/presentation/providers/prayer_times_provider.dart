import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:salah_near/core/network/supabase_client_provider.dart';
import 'package:salah_near/core/services/location_service.dart';
import 'package:salah_near/features/prayer_times/domain/entities/prayer_schedule.dart';
import 'package:salah_near/features/prayer_times/domain/repositories/prayer_times_repository.dart';
import 'package:salah_near/features/prayer_times/domain/services/prayer_calculator_service.dart';
import 'package:salah_near/features/prayer_times/data/repositories/prayer_times_repository_impl.dart';

final locationServiceProvider = Provider<LocationService>((ref) {
  return LocationService();
});

final prayerCalculatorServiceProvider = Provider<PrayerCalculatorService>((ref) {
  return PrayerCalculatorService();
});

final prayerTimesRepositoryProvider = Provider<PrayerTimesRepository>((ref) {
  final calculator = ref.watch(prayerCalculatorServiceProvider);
  final supabase = ref.watch(supabaseClientProvider);
  return PrayerTimesRepositoryImpl(
    calculatorService: calculator,
    supabaseClient: supabase,
  );
});

// Current User Coordinates Provider
final userLocationProvider = FutureProvider<Position>((ref) async {
  final locationService = ref.watch(locationServiceProvider);
  return await locationService.getCurrentLocation();
});

// Selected Date Provider (Defaults to today)
final selectedPrayerDateProvider = StateProvider<DateTime>((ref) {
  return DateTime.now();
});

// Daily Prayer Schedule Provider
final dailyPrayerScheduleProvider = FutureProvider<DailyPrayerSchedule>((ref) async {
  final repository = ref.watch(prayerTimesRepositoryProvider);
  final date = ref.watch(selectedPrayerDateProvider);
  final positionAsync = await ref.watch(userLocationProvider.future);

  return repository.getDailyPrayerSchedule(
    latitude: positionAsync.latitude,
    longitude: positionAsync.longitude,
    date: date,
  );
});

// Next Prayer Countdown Stream
final nextPrayerCountdownProvider = StreamProvider.autoDispose<Duration?>((ref) {
  final scheduleAsync = ref.watch(dailyPrayerScheduleProvider);

  return scheduleAsync.when(
    data: (schedule) {
      final nextPrayer = schedule.nextPrayer;
      if (nextPrayer == null) return Stream.value(null);

      return Stream.periodic(const Duration(seconds: 1), (_) {
        final remaining = nextPrayer.startTime.difference(DateTime.now());
        return remaining.isNegative ? Duration.zero : remaining;
      });
    },
    loading: () => Stream.value(null),
    error: (err, stack) => Stream.value(null),
  );
});
