import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/core/services/audio_service.dart';
import 'package:salah_near/core/services/notification_service.dart';
import 'package:salah_near/features/authentication/presentation/providers/auth_provider.dart';
import 'package:salah_near/routing/app_routes.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _adhanNotifications = true;
  bool _iqamahReminders = true;
  int _earlyMinutes = 10;
  String _selectedMadhab = "Shafi'i (Kerala Standard)";
  String _selectedMethod = 'Muslim World League (MWL)';

  @override
  Widget build(BuildContext context) {
    final audio = ref.read(audioServiceProvider);
    final notificationService = ref.read(notificationServiceProvider);
    final profile = ref.watch(authNotifierProvider).userProfile;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings & Reminders'),
      ),
      body: ListView(
        children: [
          // USER PROFILE & DISTRICT
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 20, 16, 8),
            child: Text(
              'ACCOUNT & LOCALITY',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
                letterSpacing: 1,
              ),
            ),
          ),
          ListTile(
            leading: const CircleAvatar(
              backgroundColor: AppColors.primaryContainer,
              child: Icon(Icons.person, color: AppColors.primary),
            ),
            title: Text(profile?.fullName ?? 'Community Member'),
            subtitle: Text(
              '@${profile?.username ?? "user"} • ${profile?.district ?? "Kozhikode"}, Kerala',
            ),
            trailing: const Icon(Icons.edit_outlined),
            onTap: () => context.push(AppRoutes.profile),
          ),
          ListTile(
            leading: const CircleAvatar(
              backgroundColor: AppColors.primaryContainer,
              child: Icon(Icons.mosque, color: AppColors.primary),
            ),
            title: const Text('Home Mosque'),
            subtitle: Text(profile?.homeMosqueName ?? 'Select primary mosque'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 14),
            onTap: () => context.push(AppRoutes.mosques),
          ),

          const Divider(),

          // PRAYER CALCULATION
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Text(
              'PRAYER CALCULATION',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
                letterSpacing: 1,
              ),
            ),
          ),
          ListTile(
            title: const Text('Juristic Method (Madhab)'),
            subtitle: Text(_selectedMadhab),
            trailing: const Icon(Icons.keyboard_arrow_right),
            onTap: () {
              showModalBottomSheet(
                context: context,
                builder: (ctx) => Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ListTile(
                      title: const Text("Shafi'i / Maliki / Hanbali (Standard for Kerala)"),
                      trailing: _selectedMadhab.startsWith("Shafi'i")
                          ? const Icon(Icons.check, color: AppColors.primary)
                          : null,
                      onTap: () {
                        setState(() => _selectedMadhab = "Shafi'i (Kerala Standard)");
                        Navigator.of(ctx).pop();
                      },
                    ),
                    ListTile(
                      title: const Text('Hanafi'),
                      trailing: _selectedMadhab.startsWith('Hanafi')
                          ? const Icon(Icons.check, color: AppColors.primary)
                          : null,
                      onTap: () {
                        setState(() => _selectedMadhab = 'Hanafi');
                        Navigator.of(ctx).pop();
                      },
                    ),
                  ],
                ),
              );
            },
          ),
          ListTile(
            title: const Text('Calculation Method'),
            subtitle: Text(_selectedMethod),
            trailing: const Icon(Icons.keyboard_arrow_right),
            onTap: () {
              showModalBottomSheet(
                context: context,
                builder: (ctx) => Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ListTile(
                      title: const Text('Muslim World League (MWL)'),
                      onTap: () {
                        setState(() => _selectedMethod = 'Muslim World League (MWL)');
                        Navigator.of(ctx).pop();
                      },
                    ),
                    ListTile(
                      title: const Text('Umm al-Qura University, Makkah'),
                      onTap: () {
                        setState(() => _selectedMethod = 'Umm al-Qura University');
                        Navigator.of(ctx).pop();
                      },
                    ),
                    ListTile(
                      title: const Text('Islamic Sciences, Karachi'),
                      onTap: () {
                        setState(() => _selectedMethod = 'Islamic Sciences, Karachi');
                        Navigator.of(ctx).pop();
                      },
                    ),
                  ],
                ),
              );
            },
          ),
          const ListTile(
            title: Text('Timezone'),
            subtitle: Text('Asia/Kolkata (IST - UTC+05:30)'),
          ),

          const Divider(),

          // NOTIFICATIONS & AUDIO PREVIEW
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Text(
              'NOTIFICATIONS & AUDIO PREVIEW',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
                letterSpacing: 1,
              ),
            ),
          ),
          SwitchListTile(
            title: const Text('Adhan Prayer Reminders'),
            subtitle: const Text('Play notification when prayer time starts'),
            value: _adhanNotifications,
            activeTrackColor: AppColors.primary,
            onChanged: (val) => setState(() => _adhanNotifications = val),
          ),
          SwitchListTile(
            title: const Text('Congregational Iqamah Warning'),
            subtitle: Text('Alert $_earlyMinutes minutes before congregation'),
            value: _iqamahReminders,
            activeTrackColor: AppColors.primary,
            onChanged: (val) => setState(() => _iqamahReminders = val),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Text('Early Warning:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(width: 12),
                ...[5, 10, 15, 20].map((mins) {
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text('${mins}m'),
                      selected: _earlyMinutes == mins,
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(
                        fontSize: 11,
                        color: _earlyMinutes == mins ? Colors.white : Colors.black87,
                      ),
                      onSelected: (val) {
                        if (val) setState(() => _earlyMinutes = mins);
                      },
                    ),
                  );
                }),
              ],
            ),
          ),

          // Audio Preview Tiles
          ListTile(
            leading: const Icon(Icons.volume_up, color: AppColors.primary),
            title: const Text('Preview Adhan Audio'),
            subtitle: const Text('Listen to traditional prayer call melody'),
            trailing: IconButton(
              icon: const Icon(Icons.play_circle_fill, color: AppColors.primary, size: 30),
              onPressed: () {
                audio.playAdhan();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Playing Adhan call audio preview...')),
                );
              },
            ),
          ),
          ListTile(
            leading: const Icon(Icons.notifications_active, color: AppColors.primary),
            title: const Text('Preview Reminder Chime'),
            subtitle: const Text('Listen to gentle congregation chime tone'),
            trailing: IconButton(
              icon: const Icon(Icons.play_circle_fill, color: AppColors.primary, size: 30),
              onPressed: () {
                audio.playChime();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Playing gentle chime preview...')),
                );
              },
            ),
          ),
          ListTile(
            leading: const Icon(Icons.notification_important_outlined, color: AppColors.primary),
            title: const Text('Trigger Test Notification'),
            subtitle: const Text('Test local notifications & exact alarm scheduling'),
            trailing: const Icon(Icons.send, color: AppColors.primary),
            onTap: () async {
              await notificationService.showTestNotification(
                title: 'Salah Reminder Test',
                body: 'Congregational prayer call scheduled for Mishkal Mosque, Calicut.',
              );
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Test notification delivered to your system tray!')),
                );
              }
            },
          ),

          const Divider(),

          // ABOUT
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Text(
              'ABOUT SALAHNEAR',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
                letterSpacing: 1,
              ),
            ),
          ),
          const ListTile(
            title: Text('Version'),
            subtitle: Text('1.0.0 (Kerala Phase 1 - 14 Districts)'),
          ),
          const ListTile(
            title: Text('Authoritative Pipeline'),
            subtitle: Text('OpenStreetMap, Kerala Masjid Committee Registry, PostGIS'),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
