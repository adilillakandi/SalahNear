import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/core/extensions/datetime_extensions.dart';
import 'package:salah_near/shared/widgets/app_loading_indicator.dart';
import 'package:salah_near/shared/widgets/empty_state_view.dart';
import 'package:salah_near/features/attendance/domain/entities/attendance_submission.dart';
import 'package:salah_near/features/attendance/presentation/providers/attendance_provider.dart';

class AttendanceHistoryScreen extends ConsumerWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final historyAsync = ref.watch(userAttendanceHistoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance Records'),
      ),
      body: historyAsync.when(
        data: (records) {
          if (records.isEmpty) {
            return const EmptyStateView(
              icon: Icons.history,
              title: 'No Check-Ins Yet',
              subtitle: 'Check in to prayers at a nearby mosque to build your streak.',
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: records.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final record = records[index];
              return Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: const BoxDecoration(
                          color: AppColors.primaryContainer,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.check_circle,
                            color: AppColors.primary, size: 24),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  record.prayerType.displayName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: _getStatusColor(record.status)
                                        .withAlpha(40),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    record.status.displayName,
                                    style: TextStyle(
                                      color: _getStatusColor(record.status),
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              record.mosqueName,
                              style: TextStyle(
                                color: Colors.grey.shade700,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              record.submittedAt.toFormattedDate(),
                              style: TextStyle(
                                color: Colors.grey.shade500,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '+${record.pointsAwarded}',
                            style: const TextStyle(
                              color: AppColors.streakFire,
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                          const Text(
                            'pts',
                            style: TextStyle(
                              color: Colors.grey,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
        loading: () => const AppLoadingIndicator(),
        error: (err, _) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Color _getStatusColor(AttendanceStatus status) {
    switch (status) {
      case AttendanceStatus.verified:
        return AppColors.success;
      case AttendanceStatus.pending:
        return AppColors.warning;
      case AttendanceStatus.flagged:
      case AttendanceStatus.rejected:
        return AppColors.error;
    }
  }
}
