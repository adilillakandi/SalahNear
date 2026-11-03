import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/features/authentication/presentation/providers/auth_provider.dart';
import 'package:salah_near/features/mosques/domain/entities/mosque_entity.dart';
import 'package:salah_near/features/mosques/presentation/providers/mosque_provider.dart';
import 'package:salah_near/routing/app_routes.dart';
import 'package:salah_near/shared/widgets/app_button.dart';

class MosqueDetailScreen extends ConsumerWidget {
  final String mosqueId;

  const MosqueDetailScreen({super.key, required this.mosqueId});

  Future<void> _openDirections(MosqueEntity mosque) async {
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=${mosque.latitude},${mosque.longitude}',
    );
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  void _showIqamahEditDialog(
      BuildContext context, WidgetRef ref, MosqueEntity mosque, Map<String, String> current) {
    final controllers = {
      'fajr': TextEditingController(text: current['fajr'] ?? '05:30'),
      'dhuhr': TextEditingController(text: current['dhuhr'] ?? '13:00'),
      'asr': TextEditingController(text: current['asr'] ?? '16:45'),
      'maghrib': TextEditingController(text: current['maghrib'] ?? '18:40'),
      'isha': TextEditingController(text: current['isha'] ?? '20:00'),
      'jummah': TextEditingController(text: current['jummah'] ?? '12:45'),
    };

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Update Mosque Iqamah Timetable'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Set announced congregation times for this mosque. Changes will reflect for all local community members.',
                  style: TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                ...controllers.entries.map((entry) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: TextField(
                      controller: entry.value,
                      decoration: InputDecoration(
                        labelText: '${entry.key.toUpperCase()} Iqamah Time',
                        prefixIcon: const Icon(Icons.access_time, size: 20),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                final updated = controllers.map((k, v) => MapEntry(k, v.text.trim()));
                await ref.read(mosqueRepositoryProvider).updateMosqueIqamahSchedule(
                      mosqueId: mosque.id,
                      iqamahTimes: updated,
                    );
                ref.invalidate(mosqueIqamahProvider(mosque.id));
                if (context.mounted) {
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Iqamah timetable updated successfully!')),
                  );
                }
              },
              child: const Text('Save Timetable'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedMosque = ref.watch(selectedMosqueProvider);
    final profile = ref.watch(authNotifierProvider).userProfile;
    final isHomeMosque = profile?.homeMosqueId == selectedMosque?.id;
    final iqamahAsync = ref.watch(mosqueIqamahProvider(mosqueId));

    if (selectedMosque == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Mosque Details')),
        body: const Center(child: Text('Mosque information not found.')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(selectedMosque.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.directions),
            tooltip: 'Directions',
            onPressed: () => _openDirections(selectedMosque),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Hero Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.primaryContainer.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
            ),
            child: Column(
              children: [
                const CircleAvatar(
                  radius: 36,
                  backgroundColor: AppColors.primary,
                  child: Icon(Icons.mosque, size: 40, color: Colors.white),
                ),
                const SizedBox(height: 12),
                Text(
                  selectedMosque.name,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                if (selectedMosque.alternateName != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    selectedMosque.alternateName!,
                    style: const TextStyle(fontSize: 13, color: Colors.grey),
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.green.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.verified, size: 14, color: Colors.green),
                          const SizedBox(width: 4),
                          Text(
                            selectedMosque.verificationStatus.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.green,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.near_me, size: 14, color: Colors.amber),
                          const SizedBox(width: 4),
                          Text(
                            selectedMosque.formattedDistance.isNotEmpty
                                ? selectedMosque.formattedDistance
                                : 'Near You',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Colors.amber.shade900,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Action Buttons: Get Directions & Set Home Mosque
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.directions, color: AppColors.primary),
                  label: const Text('Directions'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () => _openDirections(selectedMosque),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  icon: Icon(
                    isHomeMosque ? Icons.favorite : Icons.favorite_border,
                    color: Colors.white,
                  ),
                  label: Text(isHomeMosque ? 'My Home Mosque' : 'Set as Home'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isHomeMosque ? Colors.teal : AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () async {
                    if (profile != null) {
                      final updated = profile.copyWith(
                        homeMosqueId: selectedMosque.id,
                        homeMosqueName: selectedMosque.name,
                      );
                      await ref.read(authNotifierProvider.notifier).updateProfile(updated);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('${selectedMosque.name} set as your Home Mosque!')),
                        );
                      }
                    }
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Iqamah Timetable Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Congregational Iqamah Schedule',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              TextButton.icon(
                icon: const Icon(Icons.edit, size: 16),
                label: const Text('Edit Iqamah'),
                onPressed: () {
                  final current = iqamahAsync.value ?? {};
                  _showIqamahEditDialog(context, ref, selectedMosque, current);
                },
              ),
            ],
          ),
          const SizedBox(height: 8),

          iqamahAsync.when(
            data: (iqamahTimes) {
              return Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    _buildIqamahRow('Fajr', iqamahTimes['fajr'] ?? '05:30', '05:04'),
                    const Divider(height: 1),
                    _buildIqamahRow('Dhuhr', iqamahTimes['dhuhr'] ?? '13:00', '12:18'),
                    const Divider(height: 1),
                    _buildIqamahRow('Asr', iqamahTimes['asr'] ?? '16:45', '15:37'),
                    const Divider(height: 1),
                    _buildIqamahRow('Maghrib', iqamahTimes['maghrib'] ?? '18:40', '18:18'),
                    const Divider(height: 1),
                    _buildIqamahRow('Isha', iqamahTimes['isha'] ?? '20:00', '19:30'),
                    const Divider(height: 1),
                    _buildIqamahRow('Jummah (Friday)', iqamahTimes['jummah'] ?? '12:45', '12:18', isFriday: true),
                  ],
                ),
              );
            },
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: CircularProgressIndicator(),
              ),
            ),
            error: (error, stack) => const Text('Could not load Iqamah times.'),
          ),

          const SizedBox(height: 24),

          // Mosque Location & Metadata
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Mosque Directory Information',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                _buildInfoRow(Icons.place, 'Address', selectedMosque.address ?? 'Kerala, India'),
                _buildInfoRow(Icons.location_city, 'District', selectedMosque.district),
                _buildInfoRow(Icons.radar, 'Check-In Radius', '${selectedMosque.attendanceRadiusMeters} meters'),
                _buildInfoRow(Icons.pin, 'Coordinates', '${selectedMosque.latitude.toStringAsFixed(4)}, ${selectedMosque.longitude.toStringAsFixed(4)}'),
              ],
            ),
          ),
          const SizedBox(height: 28),

          AppButton(
            text: 'Check-In for Salah at this Mosque',
            onPressed: () {
              ref.read(selectedMosqueProvider.notifier).state = selectedMosque;
              context.push(AppRoutes.attendance);
            },
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildIqamahRow(String prayer, String iqamah, String start, {bool isFriday = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: isFriday ? AppColors.secondaryContainer : AppColors.primaryContainer,
            child: Icon(
              Icons.access_time_filled,
              size: 16,
              color: isFriday ? AppColors.secondaryDark : AppColors.primary,
            ),
          ),
          const SizedBox(width: 12),
          Text(
            prayer,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: isFriday ? AppColors.secondaryDark : AppColors.textPrimary,
            ),
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'Iqamah: $iqamah',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  color: AppColors.primary,
                ),
              ),
              Text(
                'Start: $start',
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: Colors.grey.shade600),
          const SizedBox(width: 10),
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13, color: Colors.black87))),
        ],
      ),
    );
  }
}
