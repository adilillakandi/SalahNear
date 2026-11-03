import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/features/leaderboard/presentation/providers/leaderboard_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final streakDays = ref.watch(userStreakDaysProvider);
    final totalPoints = ref.watch(userTotalPointsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Profile Avatar & Name
          Center(
            child: Column(
              children: [
                const CircleAvatar(
                  radius: 40,
                  backgroundColor: AppColors.primaryContainer,
                  child: Icon(
                    Icons.person,
                    size: 48,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Community Member',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Kozhikode, Kerala',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Stats Row
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.secondaryContainer.withAlpha(120),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.local_fire_department,
                          color: AppColors.streakFire, size: 28),
                      const SizedBox(height: 8),
                      Text(
                        '$streakDays Days',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Text(
                        'Active Streak',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer.withAlpha(120),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.stars_rounded,
                          color: AppColors.primary, size: 28),
                      const SizedBox(height: 8),
                      Text(
                        '$totalPoints pts',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Text(
                        'Total Points',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Action List
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.history, color: AppColors.primary),
                  title: const Text('Attendance History'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/attendance/history'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.people_outline,
                      color: AppColors.primary),
                  title: const Text('Mosque Companions (Friends)'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/friends'),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.settings_outlined,
                      color: AppColors.primary),
                  title: const Text('Prayer & Notification Settings'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/settings'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
