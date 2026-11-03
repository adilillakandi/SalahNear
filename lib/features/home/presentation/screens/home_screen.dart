import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/core/extensions/datetime_extensions.dart';
import 'package:salah_near/shared/widgets/app_loading_indicator.dart';
import 'package:salah_near/features/prayer_times/presentation/providers/prayer_times_provider.dart';
import 'package:salah_near/features/mosques/presentation/providers/mosque_provider.dart';
import 'package:salah_near/features/leaderboard/presentation/providers/leaderboard_provider.dart';
import 'package:salah_near/features/attendance/presentation/providers/attendance_provider.dart';
import 'package:salah_near/features/friends/presentation/providers/friends_provider.dart';
import 'package:salah_near/features/friends/presentation/widgets/encounter_card.dart';
import 'package:salah_near/features/home/presentation/widgets/next_prayer_card.dart';
import 'package:salah_near/features/home/presentation/widgets/prayer_time_row.dart';
import 'package:salah_near/features/home/presentation/widgets/streak_badge.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheduleAsync = ref.watch(dailyPrayerScheduleProvider);
    final countdownAsync = ref.watch(nextPrayerCountdownProvider);
    final selectedMosque = ref.watch(selectedMosqueProvider);
    final streakDays = ref.watch(userStreakDaysProvider);
    final totalPoints = ref.watch(userTotalPointsProvider);
    final encountersAsync = ref.watch(pendingEncountersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('SalahNear'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: StreakBadge(
              streakDays: streakDays,
              totalPoints: totalPoints,
              onTap: () => context.push('/leaderboard'),
            ),
          ),
        ],
      ),
      body: scheduleAsync.when(
        data: (schedule) {
          final nextPrayer = schedule.nextPrayer;
          final countdown = countdownAsync.value;

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(dailyPrayerScheduleProvider);
              ref.invalidate(userLocationProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Mosque selector header banner
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer.withAlpha(100),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primaryLight.withAlpha(80),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.location_on,
                          color: AppColors.primary, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              selectedMosque?.name ??
                                  'Kerala, India (Automatic GPS)',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              DateTime.now().toFormattedDate(),
                              style: TextStyle(
                                color: Colors.grey.shade700,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.push('/mosques'),
                        child: const Text('Change'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Pending Mosque Encounter Banner
                encountersAsync.when(
                  data: (encounters) {
                    if (encounters.isEmpty) return const SizedBox.shrink();
                    final first = encounters.first;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: EncounterCard(encounter: first),
                    );
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (error, stack) => const SizedBox.shrink(),
                ),

                // Next Prayer Hero Card
                NextPrayerCard(
                  nextPrayer: nextPrayer,
                  remainingTime: countdown,
                  mosqueName: selectedMosque?.name,
                  onCheckInPressed: () {
                    if (nextPrayer != null) {
                      ref.read(selectedCheckInPrayerProvider.notifier).state =
                          nextPrayer.type;
                    }
                    context.push('/attendance');
                  },
                ),
                const SizedBox(height: 24),

                // Today's Salah Times List Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Today's Prayers",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () => context.push('/prayer-times'),
                      icon: const Icon(Icons.calendar_month, size: 16),
                      label: const Text('Full Timetable'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // 5 Daily Prayers
                ...schedule.prayers.map((prayer) {
                  return PrayerTimeRow(prayer: prayer);
                }),

                const SizedBox(height: 20),

                // Quick Mosque Discovery Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardTheme.color,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.explore,
                            color: AppColors.primary, size: 24),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Nearby Mosques',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              'Discover Kerala masjids and Iqamah times',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.arrow_forward_ios, size: 16),
                        onPressed: () => context.push('/mosques'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
        loading: () => const AppLoadingIndicator(
          message: 'Calculating prayer times for your location...',
        ),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 12),
              Text('Error calculating prayer times: $err'),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => ref.refresh(dailyPrayerScheduleProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
