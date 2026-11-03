import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/core/permissions/permission_service.dart';
import 'package:salah_near/core/services/audio_service.dart';
import 'package:salah_near/features/authentication/domain/entities/user_profile.dart';
import 'package:salah_near/features/authentication/presentation/providers/auth_provider.dart';
import 'package:salah_near/features/mosques/presentation/providers/mosque_provider.dart';
import 'package:salah_near/routing/app_routes.dart';
import 'package:salah_near/shared/widgets/app_button.dart';

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _currentStep = 0;

  // Step 1: Identity
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _usernameController = TextEditingController();

  // Step 2: District
  static const List<String> _keralaDistricts = [
    'Alappuzha',
    'Ernakulam',
    'Idukki',
    'Kannur',
    'Kasaragod',
    'Kollam',
    'Kottayam',
    'Kozhikode',
    'Malappuram',
    'Palakkad',
    'Pathanamthitta',
    'Thiruvananthapuram',
    'Thrissur',
    'Wayanad',
  ];
  String _selectedDistrict = 'Kozhikode';

  // Step 3: Home Mosque
  String? _selectedMosqueId;
  String? _selectedMosqueName;
  String _mosqueSearchQuery = '';

  // Step 4: Reminder preferences
  int _reminderOffsetMinutes = 10;
  String _soundPreference = 'adhan'; // 'adhan', 'chime', 'default'
  bool _vibrationEnabled = true;

  @override
  void initState() {
    super.initState();
    final profile = ref.read(authNotifierProvider).userProfile;
    if (profile != null) {
      _nameController.text = profile.fullName;
      if (profile.username != null) {
        _usernameController.text = profile.username!;
      }
      if (profile.district != null &&
          _keralaDistricts.contains(profile.district)) {
        _selectedDistrict = profile.district!;
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _usernameController.dispose();
    super.dispose();
  }

  Future<void> _handlePermissions() async {
    final permissionService = ref.read(permissionServiceProvider);
    await permissionService.requestNotificationPermission();
    await permissionService.requestLocationPermission();
  }

  Future<void> _finishOnboarding() async {
    await _handlePermissions();

    final currentProfile = ref.read(authNotifierProvider).userProfile;
    final updated = UserProfile(
      id: currentProfile?.id ?? 'user-${DateTime.now().millisecondsSinceEpoch}',
      fullName: _nameController.text.trim().isNotEmpty
          ? _nameController.text.trim()
          : 'SalahNear Brother',
      username: _usernameController.text.trim().isNotEmpty
          ? _usernameController.text.trim().replaceAll('@', '')
          : 'brother_${DateTime.now().millisecondsSinceEpoch % 1000}',
      district: _selectedDistrict,
      homeMosqueId: _selectedMosqueId,
      homeMosqueName: _selectedMosqueName,
      totalPoints: currentProfile?.totalPoints ?? 0,
      currentStreak: currentProfile?.currentStreak ?? 0,
      hasCompletedOnboarding: true,
    );

    await ref.read(authNotifierProvider.notifier).updateProfile(updated);
    if (!mounted) return;
    context.go(AppRoutes.home);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Setup Your Profile'),
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Stepper indicator
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              child: Row(
                children: List.generate(4, (index) {
                  final isActive = index <= _currentStep;
                  return Expanded(
                    child: Container(
                      height: 4,
                      margin: EdgeInsets.only(right: index < 3 ? 6 : 0),
                      decoration: BoxDecoration(
                        color: isActive ? AppColors.primary : Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Step ${_currentStep + 1} of 4: ${_stepTitle(_currentStep)}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: _buildStepContent(_currentStep),
              ),
            ),

            // Navigation Buttons
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    offset: const Offset(0, -3),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Row(
                children: [
                  if (_currentStep > 0)
                    Expanded(
                      flex: 1,
                      child: Padding(
                        padding: const EdgeInsets.only(right: 12),
                        child: OutlinedButton(
                          onPressed: () {
                            setState(() => _currentStep--);
                          },
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: const Text('Back'),
                        ),
                      ),
                    ),
                  Expanded(
                    flex: 2,
                    child: AppButton(
                      text: _currentStep == 3 ? 'Finish & Explore' : 'Continue',
                      onPressed: () {
                        if (_currentStep < 3) {
                          if (_currentStep == 0 &&
                              _nameController.text.trim().isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Please enter your full name'),
                              ),
                            );
                            return;
                          }
                          setState(() => _currentStep++);
                        } else {
                          _finishOnboarding();
                        }
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _stepTitle(int step) {
    switch (step) {
      case 0:
        return 'Identity & Username';
      case 1:
        return 'Kerala District';
      case 2:
        return 'Home Mosque Selection';
      case 3:
        return 'Adhan & Reminders';
      default:
        return '';
    }
  }

  Widget _buildStepContent(int step) {
    switch (step) {
      case 0:
        return _buildStep1Identity();
      case 1:
        return _buildStep2District();
      case 2:
        return _buildStep3HomeMosque();
      case 3:
        return _buildStep4Preferences();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildStep1Identity() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Who are you in the community?',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Your display name and username will be visible on the leaderboard and to friends you pray with.',
          style: TextStyle(fontSize: 14, color: Colors.grey),
        ),
        const SizedBox(height: 28),
        TextField(
          controller: _nameController,
          decoration: InputDecoration(
            labelText: 'Full / Display Name',
            hintText: 'e.g. Anshad Kozhikode',
            prefixIcon: const Icon(Icons.person_outline),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _usernameController,
          decoration: InputDecoration(
            labelText: 'Username (@handle)',
            hintText: 'e.g. anshad_clt',
            prefixText: '@',
            prefixIcon: const Icon(Icons.alternate_email),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ],
    );
  }

  Widget _buildStep2District() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Choose your Kerala District',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'This helps calculate exact local prayer times and discover nearby masjids in your locality.',
          style: TextStyle(fontSize: 14, color: Colors.grey),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedDistrict,
              isExpanded: true,
              icon: const Icon(Icons.keyboard_arrow_down),
              items: _keralaDistricts.map((district) {
                return DropdownMenuItem(
                  value: district,
                  child: Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          color: AppColors.primary, size: 20),
                      const SizedBox(width: 12),
                      Text(
                        district,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) setState(() => _selectedDistrict = val);
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep3HomeMosque() {
    final mosquesAsync = ref.watch(nearbyMosquesProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Select your Home Mosque',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Pick your primary congregation masjid. You can change this at any time in settings.',
          style: TextStyle(fontSize: 14, color: Colors.grey),
        ),
        const SizedBox(height: 20),
        TextField(
          decoration: InputDecoration(
            hintText: 'Search mosque name or locality...',
            prefixIcon: const Icon(Icons.search),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          onChanged: (val) => setState(() => _mosqueSearchQuery = val.toLowerCase()),
        ),
        const SizedBox(height: 16),
        mosquesAsync.when(
          data: (mosques) {
            final filtered = mosques.where((m) {
              final q = _mosqueSearchQuery;
              if (q.isEmpty) return true;
              return m.name.toLowerCase().contains(q) ||
                  (m.cityOrLocality?.toLowerCase().contains(q) ?? false);
            }).toList();

            if (filtered.isEmpty) {
              return Container(
                padding: const EdgeInsets.all(24),
                alignment: Alignment.center,
                child: const Text('No matching mosques found in directory.'),
              );
            }

            return ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filtered.length > 5 ? 5 : filtered.length,
              separatorBuilder: (context, index) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final mosque = filtered[index];
                final isSelected = _selectedMosqueId == mosque.id;

                return InkWell(
                  onTap: () {
                    setState(() {
                      _selectedMosqueId = mosque.id;
                      _selectedMosqueName = mosque.name;
                    });
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary.withValues(alpha: 0.1)
                          : Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : Colors.grey.shade200,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.mosque,
                          color: isSelected ? AppColors.primary : Colors.grey,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                mosque.name,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: isSelected
                                      ? AppColors.primary
                                      : AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                '${mosque.cityOrLocality ?? _selectedDistrict} • ${mosque.verificationStatus}',
                                style: const TextStyle(
                                    fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        if (isSelected)
                          const Icon(Icons.check_circle,
                              color: AppColors.primary),
                      ],
                    ),
                  ),
                );
              },
            );
          },
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.all(24),
              child: CircularProgressIndicator(),
            ),
          ),
          error: (error, stack) => const Text('Could not load nearby mosques list.'),
        ),
      ],
    );
  }

  Widget _buildStep4Preferences() {
    final audio = ref.read(audioServiceProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Prayer Reminders & Adhan',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Configure reminder notifications ahead of congregation times.',
          style: TextStyle(fontSize: 14, color: Colors.grey),
        ),
        const SizedBox(height: 24),

        // Reminder offset
        const Text(
          'When to notify:',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 8),
        Row(
          children: [0, 10, 15, 20].map((mins) {
            final isSelected = _reminderOffsetMinutes == mins;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: ChoiceChip(
                  label: Text(mins == 0 ? 'Exact' : '${mins}m early'),
                  selected: isSelected,
                  selectedColor: AppColors.primary.withValues(alpha: 0.2),
                  onSelected: (val) {
                    if (val) setState(() => _reminderOffsetMinutes = mins);
                  },
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 24),

        // Sound Selection
        const Text(
          'Alert Audio:',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 8),
        ListTile(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.grey.shade300),
          ),
          leading: const Icon(Icons.volume_up, color: AppColors.primary),
          title: const Text('Adhan Call to Prayer'),
          subtitle: const Text('Traditional melodic Salah reminder'),
          trailing: IconButton(
            icon: const Icon(Icons.play_circle_fill, color: AppColors.primary),
            onPressed: () => audio.playAdhan(),
          ),
          tileColor: _soundPreference == 'adhan'
              ? AppColors.primary.withValues(alpha: 0.08)
              : null,
          onTap: () => setState(() => _soundPreference = 'adhan'),
        ),
        const SizedBox(height: 8),
        ListTile(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.grey.shade300),
          ),
          leading: const Icon(Icons.notifications_active_outlined,
              color: AppColors.primary),
          title: const Text('Gentle Chime Tone'),
          trailing: IconButton(
            icon: const Icon(Icons.play_circle_fill, color: AppColors.primary),
            onPressed: () => audio.playChime(),
          ),
          tileColor: _soundPreference == 'chime'
              ? AppColors.primary.withValues(alpha: 0.08)
              : null,
          onTap: () => setState(() => _soundPreference = 'chime'),
        ),
        const SizedBox(height: 16),

        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Vibration Alert'),
          subtitle: const Text('Vibrate phone when reminder fires'),
          value: _vibrationEnabled,
          activeTrackColor: AppColors.primary,
          onChanged: (val) => setState(() => _vibrationEnabled = val),
        ),
      ],
    );
  }
}
