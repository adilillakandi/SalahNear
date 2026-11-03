import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/core/extensions/datetime_extensions.dart';
import 'package:salah_near/shared/widgets/app_loading_indicator.dart';
import 'package:salah_near/features/prayer_times/presentation/providers/prayer_times_provider.dart';

class PrayerTimesScreen extends ConsumerWidget {
  const PrayerTimesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheduleAsync = ref.watch(dailyPrayerScheduleProvider);
    final selectedDate = ref.watch(selectedPrayerDateProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Prayer Schedule'),
      ),
      body: Column(
        children: [
          // Date Selector Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: AppColors.primaryContainer.withAlpha(80),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () {
                    ref.read(selectedPrayerDateProvider.notifier).state =
                        selectedDate.subtract(const Duration(days: 1));
                  },
                ),
                Text(
                  selectedDate.toFormattedDate(),
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () {
                    ref.read(selectedPrayerDateProvider.notifier).state =
                        selectedDate.add(const Duration(days: 1));
                  },
                ),
              ],
            ),
          ),
          Expanded(
            child: scheduleAsync.when(
              data: (schedule) {
                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (schedule.sunrise != null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: AppColors.secondaryContainer.withAlpha(120),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.wb_sunny_outlined,
                                    color: AppColors.secondaryDark, size: 20),
                                SizedBox(width: 8),
                                Text(
                                  'Sunrise (ഇശ്‌റാഖ് / സൂര്യോദയം)',
                                  style: TextStyle(fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                            Text(
                              schedule.sunrise!.toPrayerTimeString(),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: AppColors.onSecondaryContainer,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ...schedule.prayers.map((prayer) {
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    prayer.displayName,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    prayer.arabicName,
                                    style: TextStyle(
                                      color: Colors.grey.shade600,
                                      fontSize: 14,
                                    ),
                                  ),
                                  if (prayer.iqamahTime != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        'Iqamah: ${prayer.iqamahTime!.toPrayerTimeString()}',
                                        style: const TextStyle(
                                          color: AppColors.primary,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    prayer.startTime.toPrayerTimeString(),
                                    style: const TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  Text(
                                    '+${prayer.basePoints} points',
                                    style: const TextStyle(
                                      color: AppColors.streakFire,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                );
              },
              loading: () => const AppLoadingIndicator(),
              error: (err, _) => Center(child: Text('Error: $err')),
            ),
          ),
        ],
      ),
    );
  }
}
