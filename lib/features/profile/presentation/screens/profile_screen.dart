import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/features/authentication/presentation/providers/auth_provider.dart';
import 'package:salah_near/routing/app_routes.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(authNotifierProvider).userProfile;

    final displayName = profile?.fullName ?? 'Anshad Kozhikode';
    final username = profile?.username ?? 'anshad_clt';
    final district = profile?.district ?? 'Kozhikode';
    final streakDays = profile?.currentStreak ?? 7;
    final totalPoints = profile?.totalPoints ?? 125;
    final homeMosqueName = profile?.homeMosqueName ?? 'Mishkal Mosque, Kuttichira';

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push(AppRoutes.settings),
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
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: AppColors.primary,
                    shape: BoxShape.circle,
                  ),
                  child: CircleAvatar(
                    radius: 40,
                    backgroundColor: AppColors.primaryContainer,
                    child: Text(
                      displayName.substring(0, 1).toUpperCase(),
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  displayName,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '@$username • $district, Kerala',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '🕌 $homeMosqueName',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryDark,
                    ),
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
                    color: AppColors.secondaryContainer.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppColors.secondary.withValues(alpha: 0.3),
                    ),
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
                        'Active Daily Streak',
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
                    color: AppColors.primaryContainer.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.2),
                    ),
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
                        'Community Points',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Badges Showcase
          const Text(
            'Achievements & Badges',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                _buildBadgeItem(
                  Icons.wb_sunny_outlined,
                  'Fajr Club Consistent',
                  'Prayed Fajr in congregation 7 consecutive days',
                  isEarned: true,
                ),
                const Divider(height: 20),
                _buildBadgeItem(
                  Icons.check_circle_outline,
                  '5-Prayer Perfect Day',
                  'Completed all 5 daily prayers in a masjid',
                  isEarned: true,
                ),
                const Divider(height: 20),
                _buildBadgeItem(
                  Icons.hub_outlined,
                  'Mosque Companion Network',
                  'Met and confirmed 5 shared congregation encounters',
                  isEarned: true,
                ),
                const Divider(height: 20),
                _buildBadgeItem(
                  Icons.military_tech_outlined,
                  'Monthly Kerala Champion',
                  'Rank in the top 10 statewide on the monthly board',
                  isEarned: false,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Action List
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 0,
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.history, color: AppColors.primary),
                  title: const Text('Attendance History'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(AppRoutes.attendanceHistory),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.people_outline, color: AppColors.primary),
                  title: const Text('Mosque Companions (Friends & Encounters)'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(AppRoutes.friends),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.edit_note, color: AppColors.primary),
                  title: const Text('Re-run Onboarding Setup Wizard'),
                  subtitle: const Text('Update district, home mosque & preferences'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(AppRoutes.onboarding),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.settings_outlined, color: AppColors.primary),
                  title: const Text('Prayer Reminders & Audio Settings'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push(AppRoutes.settings),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.logout, color: Colors.red),
                  title: const Text(
                    'Sign Out / Switch Account',
                    style: TextStyle(color: Colors.red),
                  ),
                  onTap: () async {
                    await ref.read(authNotifierProvider.notifier).signOut();
                    if (context.mounted) {
                      context.go(AppRoutes.login);
                    }
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildBadgeItem(IconData icon, String title, String subtitle,
      {required bool isEarned}) {
    return Row(
      children: [
        CircleAvatar(
          radius: 20,
          backgroundColor: isEarned
              ? AppColors.primaryContainer
              : Colors.grey.shade100,
          child: Icon(
            icon,
            size: 22,
            color: isEarned ? AppColors.primary : Colors.grey.shade400,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: isEarned ? AppColors.textPrimary : Colors.grey,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 11,
                  color: isEarned ? AppColors.textSecondary : Colors.grey.shade400,
                ),
              ),
            ],
          ),
        ),
        if (isEarned)
          const Icon(Icons.verified, color: AppColors.primary, size: 20)
        else
          Icon(Icons.lock_outline, color: Colors.grey.shade400, size: 18),
      ],
    );
  }
}
