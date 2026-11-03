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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Community Leaderboard'),
      ),
      body: Column(
        children: [
          // Filter Scope Chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ChoiceChip(
                  label: const Text('Kerala Statewide'),
                  selected: scope == LeaderboardScope.global,
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
          Expanded(
            child: leaderboardAsync.when(
              data: (entries) {
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: entries.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final entry = entries[index];
                    return _buildLeaderboardTile(context, entry);
                  },
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

  Widget _buildLeaderboardTile(BuildContext context, LeaderboardEntry entry) {
    Color rankColor;
    if (entry.rank == 1) {
      rankColor = const Color(0xFFFFD700); // Gold
    } else if (entry.rank == 2) {
      rankColor = const Color(0xFFC0C0C0); // Silver
    } else if (entry.rank == 3) {
      rankColor = const Color(0xFFCD7F32); // Bronze
    } else {
      rankColor = Colors.grey.shade400;
    }

    return Card(
      elevation: 0,
      color: entry.isCurrentUser
          ? AppColors.primaryContainer.withAlpha(100)
          : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: entry.isCurrentUser
              ? AppColors.primary
              : Colors.grey.shade200,
          width: entry.isCurrentUser ? 1.5 : 1.0,
        ),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: rankColor.withAlpha(40),
          child: Text(
            '#${entry.rank}',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: entry.rank <= 3 ? Colors.black87 : Colors.grey.shade700,
            ),
          ),
        ),
        title: Row(
          children: [
            Text(
              entry.displayName,
              style: TextStyle(
                fontWeight:
                    entry.isCurrentUser ? FontWeight.bold : FontWeight.w600,
              ),
            ),
            if (entry.isCurrentUser) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'YOU',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ],
        ),
        subtitle: Row(
          children: [
            const Icon(
              Icons.local_fire_department,
              size: 14,
              color: AppColors.streakFire,
            ),
            const SizedBox(width: 4),
            Text(
              '${entry.currentStreakDays} day streak',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            if (entry.preferredMosqueName != null) ...[
              const SizedBox(width: 8),
              Text(
                '• ${entry.preferredMosqueName}',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
            ],
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '${entry.totalPoints}',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: AppColors.primary,
              ),
            ),
            const Text(
              'points',
              style: TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
