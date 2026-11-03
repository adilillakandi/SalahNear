import 'package:flutter/material.dart';
import 'package:salah_near/core/constants/app_colors.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _adhanNotifications = true;
  bool _iqamahReminders = true;
  final String _selectedMadhab = "Shafi'i (Kerala Standard)";
  final String _selectedMethod = 'Muslim World League (MWL)';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 20, 16, 8),
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
            trailing: const Icon(Icons.arrow_drop_down),
            onTap: () {},
          ),
          ListTile(
            title: const Text('Calculation Authority'),
            subtitle: Text(_selectedMethod),
            trailing: const Icon(Icons.arrow_drop_down),
            onTap: () {},
          ),
          const Divider(),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Text(
              'NOTIFICATIONS & ALERTS',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
                letterSpacing: 1,
              ),
            ),
          ),
          SwitchListTile(
            title: const Text('Adhan Call Notifications'),
            subtitle: const Text('Play notification when prayer time starts'),
            value: _adhanNotifications,
            activeThumbColor: AppColors.primary,
            onChanged: (val) {
              setState(() => _adhanNotifications = val);
            },
          ),
          SwitchListTile(
            title: const Text('Iqamah Reminders'),
            subtitle: const Text('10-minute warning before congregational prayer'),
            value: _iqamahReminders,
            activeThumbColor: AppColors.primary,
            onChanged: (val) {
              setState(() => _iqamahReminders = val);
            },
          ),
          const Divider(),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Text(
              'ABOUT',
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
            subtitle: Text('1.0.0 (Kerala Phase 1 MVP)'),
          ),
          const ListTile(
            title: Text('Data Sources'),
            subtitle: Text('OpenStreetMap, Local Kerala Mosques'),
          ),
        ],
      ),
    );
  }
}
