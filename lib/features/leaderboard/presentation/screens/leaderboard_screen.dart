import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/shared/widgets/app_loading_indicator.dart';
import 'package:salah_near/features/leaderboard/domain/entities/leaderboard_entry.dart';
import 'package:salah_near/features/leaderboard/presentation/providers/leaderboard_provider.dart';

class LeaderboardScreen extends ConsumerWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final leaderboardAsync = ref.watch(leaderboardProvider);
    final scope = ref.watch(leaderboardScopeProvider);
    final period = ref.watch(leaderboardPeriodProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Community Leaderboard'),
      ),
      body: Column(
        children: [
          // Period Segmented Control (Daily / Weekly / Monthly)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: Colors.white,
            child: Row(
              children: [
                Expanded(
                  child: _buildPeriodButton(
                    ref,
                    'Daily',
                    LeaderboardPeriod.daily,
                    period,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildPeriodButton(
                    ref,
                    'Weekly',
                    LeaderboardPeriod.weekly,
                    period,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildPeriodButton(
                    ref,
                    'Monthly',
                    LeaderboardPeriod.monthly,
                    period,
                  ),
                ),
              ],
            ),
          ),

          // Scope Filters
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ChoiceChip(
                  label: const Text('Kerala Statewide'),
                  selected: scope == LeaderboardScope.global,
                  selectedColor: AppColors.primary,
                  labelStyle: TextStyle(
                    fontSize: 12,
                    color: scope == LeaderboardScope.global
                        ? Colors.white
                        : Colors.black87,
                    fontWeight: scope == LeaderboardScope.global
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                  onSelected: (val) {
                    if (val) {
                      ref.read(leaderboardScopeProvider.notifier).state =
                          LeaderboardScope.global;
                    }
                  },
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('My District'),
                  selected: scope == LeaderboardScope.district,
                  selectedColor: AppColors.primary,
                  labelStyle: TextStyle(
                    fontSize: 12,
                    color: scope == LeaderboardScope.district
                        ? Colors.white
                        : Colors.black87,
                    fontWeight: scope == LeaderboardScope.district
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                  onSelected: (val) {
                    if (val) {
                      ref.read(leaderboardScopeProvider.notifier).state =
                          LeaderboardScope.district;
                    }
                  },
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Home Mosque'),
                  selected: scope == LeaderboardScope.mosque,
                  selectedColor: AppColors.primary,
                  labelStyle: TextStyle(
                    fontSize: 12,
                    color: scope == LeaderboardScope.mosque
                        ? Colors.white
                        : Colors.black87,
                    fontWeight: scope == LeaderboardScope.mosque
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                  onSelected: (val) {
                    if (val) {
                      ref.read(leaderboardScopeProvider.notifier).state =
                          LeaderboardScope.mosque;
                    }
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: leaderboardAsync.when(
              data: (entries) {
                if (entries.isEmpty) {
                  return const Center(child: Text('No leaderboard entries yet.'));
                }

                final top3 = entries.take(3).toList();
                final remaining = entries.skip(3).toList();
                final currentUserEntry = entries
                    .where((e) => e.isCurrentUser)
                    .firstOrNull;

                return Column(
                  children: [
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (top3.length >= 3) _buildPodium(top3),
                          const SizedBox(height: 16),
                          ...remaining.map((entry) => _buildEntryTile(entry)),
                        ],
                      ),
                    ),
                    if (currentUserEntry != null)
                      _buildCurrentUserFooter(currentUserEntry),
                  ],
                );
              },
              loading: () => const Center(child: AppLoadingIndicator()),
              error: (err, stack) => Center(child: Text('Error: $err')),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodButton(
    WidgetRef ref,
    String label,
    LeaderboardPeriod target,
    LeaderboardPeriod current,
  ) {
    final isSelected = target == current;
    return InkWell(
      onTap: () {
        ref.read(leaderboardPeriodProvider.notifier).state = target;
      },
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(10),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : Colors.black87,
          ),
        ),
      ),
    );
  }

  Widget _buildPodium(List<LeaderboardEntry> top3) {
    final first = top3[0];
    final second = top3[1];
    final third = top3[2];

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: BoxDecoration(
        color: AppColors.primaryContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // #2 Silver
          _buildPodiumColumn(second, 2, const Color(0xFFC0C0C0), 90),
          // #1 Gold
          _buildPodiumColumn(first, 1, const Color(0xFFFFD700), 120, isWinner: true),
          // #3 Bronze
          _buildPodiumColumn(third, 3, const Color(0xFFCD7F32), 75),
        ],
      ),
    );
  }

  Widget _buildPodiumColumn(
    LeaderboardEntry entry,
    int rank,
    Color color,
    double height, {
    bool isWinner = false,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (isWinner)
          const Icon(Icons.workspace_premium, color: Color(0xFFFFD700), size: 28),
        CircleAvatar(
          radius: isWinner ? 28 : 22,
          backgroundColor: color,
          child: CircleAvatar(
            radius: isWinner ? 25 : 19,
            backgroundColor: Colors.white,
            child: Text(
              entry.displayName.substring(0, 1).toUpperCase(),
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: isWinner ? 18 : 14,
                color: AppColors.primary,
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        SizedBox(
          width: 80,
          child: Text(
            entry.displayName,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ),
        Text(
          '${entry.totalPoints} pts',
          style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        Container(
          width: 70,
          height: height,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.8),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(10)),
          ),
          alignment: Alignment.topCenter,
          padding: const EdgeInsets.only(top: 8),
          child: Text(
            '#$rank',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              fontSize: 18,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEntryTile(LeaderboardEntry entry) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: entry.isCurrentUser
            ? AppColors.primaryContainer.withValues(alpha: 0.5)
            : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: entry.isCurrentUser
              ? AppColors.primary
              : Colors.grey.shade200,
          width: entry.isCurrentUser ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            alignment: Alignment.center,
            child: Text(
              '#${entry.rank}',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: entry.isCurrentUser ? AppColors.primary : Colors.grey,
              ),
            ),
          ),
          const SizedBox(width: 10),
          CircleAvatar(
            radius: 18,
            backgroundColor: AppColors.primaryContainer,
            child: Text(
              entry.displayName.substring(0, 1).toUpperCase(),
              style: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.displayName,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: entry.isCurrentUser
                        ? AppColors.primaryDark
                        : AppColors.textPrimary,
                  ),
                ),
                if (entry.preferredMosqueName != null)
                  Text(
                    entry.preferredMosqueName!,
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${entry.totalPoints} pts',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: AppColors.primary,
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.local_fire_department,
                      color: AppColors.streakFire, size: 14),
                  const SizedBox(width: 2),
                  Text(
                    '${entry.currentStreakDays}d streak',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppColors.streakFire,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentUserFooter(LeaderboardEntry entry) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.primaryDark,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.secondary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '#${entry.rank}',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Your Standing',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                    ),
                  ),
                  Text(
                    'Keep praying in congregation!',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${entry.totalPoints} pts',
                  style: const TextStyle(
                    color: AppColors.secondaryLight,
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                Text(
                  '🔥 ${entry.currentStreakDays}d streak',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
