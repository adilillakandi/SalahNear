import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/core/constants/prayer_names.dart';
import 'package:salah_near/shared/widgets/app_button.dart';
import 'package:salah_near/features/mosques/presentation/providers/mosque_provider.dart';
import 'package:salah_near/features/attendance/presentation/providers/attendance_provider.dart';

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  File? _evidencePhoto;
  final ImagePicker _picker = ImagePicker();

  Future<void> _takePhoto() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 75,
      );
      if (image != null) {
        setState(() {
          _evidencePhoto = File(image.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to open camera: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedMosque = ref.watch(selectedMosqueProvider);
    final selectedPrayer = ref.watch(selectedCheckInPrayerProvider);
    final submissionState = ref.watch(attendanceSubmissionNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mosque Attendance Check-In'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            onPressed: () => context.push('/attendance/history'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Target Mosque Box
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer.withAlpha(80),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.primaryLight.withAlpha(80)),
            ),
            child: Row(
              children: [
                const CircleAvatar(
                  backgroundColor: AppColors.primary,
                  child: Icon(Icons.mosque, color: Colors.white, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'CHECK-IN MOSQUE',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        selectedMosque?.name ??
                            'Mishkal Mosque (Default Selected)',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
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
          const SizedBox(height: 20),

          // Prayer Selection Chips
          const Text(
            'Select Prayer',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: PrayerType.values.map((prayer) {
                final isSelected = selectedPrayer == prayer;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text('${prayer.displayName} (+${prayer.basePoints})'),
                    selected: isSelected,
                    selectedColor: AppColors.primary,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : Colors.black87,
                      fontWeight:
                          isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    onSelected: (val) {
                      if (val) {
                        ref.read(selectedCheckInPrayerProvider.notifier).state =
                            prayer;
                      }
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 24),

          // Camera Evidence Section
          const Text(
            'Attendance Evidence (Photo)',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          InkWell(
            onTap: _takePhoto,
            borderRadius: BorderRadius.circular(16),
            child: Container(
              height: 180,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: Colors.grey.shade300,
                  style: BorderStyle.solid,
                ),
              ),
              child: _evidencePhoto != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.file(
                        _evidencePhoto!,
                        fit: BoxFit.cover,
                        width: double.infinity,
                      ),
                    )
                  : Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.camera_alt_outlined,
                            size: 40,
                            color: Colors.grey.shade600,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Take Photo at Mosque',
                            style: TextStyle(
                              color: Colors.grey.shade700,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Live camera verification required',
                            style: TextStyle(
                              color: Colors.grey.shade500,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 24),

          // Verification Guidelines Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.amber.shade200),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.info_outline, color: Colors.amber, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'To verify attendance, your GPS location must be within the mosque geofence (100m) and submitted during the prayer window.',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.brown.shade800,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Submit Check-In Button
          AppButton(
            text: 'Verify & Check In (+${selectedPrayer.basePoints} Pts)',
            icon: Icons.verified_user_outlined,
            isLoading: submissionState.isLoading,
            onPressed: () async {
              final mosqueId = selectedMosque?.id ?? '1';
              final mosqueName =
                  selectedMosque?.name ?? 'Mishkal Mosque, Calicut';

              final success = await ref
                  .read(attendanceSubmissionNotifierProvider.notifier)
                  .submitCheckIn(
                    mosqueId: mosqueId,
                    mosqueName: mosqueName,
                    prayerType: selectedPrayer,
                    evidencePhoto: _evidencePhoto,
                  );

              if (!context.mounted) return;
              if (success) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Successfully submitted ${selectedPrayer.displayName} check-in!',
                    ),
                    backgroundColor: AppColors.success,
                  ),
                );
                context.push('/attendance/history');
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Failed to submit attendance check-in.'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
          ),
        ],
      ),
    );
  }
}
