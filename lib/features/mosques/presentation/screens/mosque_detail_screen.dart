import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/shared/widgets/app_button.dart';
import 'package:salah_near/features/mosques/presentation/providers/mosque_provider.dart';

class MosqueDetailScreen extends ConsumerWidget {
  final String mosqueId;

  const MosqueDetailScreen({super.key, required this.mosqueId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedMosque = ref.watch(selectedMosqueProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(selectedMosque?.name ?? 'Mosque Details'),
      ),
      body: selectedMosque == null
          ? const Center(child: Text('Mosque details not found.'))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                // Header Hero
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer.withAlpha(120),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.mosque,
                          size: 64, color: AppColors.primary),
                      const SizedBox(height: 12),
                      Text(
                        selectedMosque.name,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (selectedMosque.alternateName != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          selectedMosque.alternateName!,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey.shade700,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Details Card
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Location Details',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Divider(height: 24),
                        _buildDetailRow(
                          Icons.location_city,
                          'District',
                          selectedMosque.district,
                        ),
                        if (selectedMosque.address != null)
                          _buildDetailRow(
                            Icons.place,
                            'Address',
                            selectedMosque.address!,
                          ),
                        _buildDetailRow(
                          Icons.radar,
                          'Attendance Geofence',
                          '${selectedMosque.attendanceRadiusMeters} meters',
                        ),
                        _buildDetailRow(
                          Icons.verified,
                          'Status',
                          selectedMosque.verificationStatus.toUpperCase(),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                AppButton(
                  text: 'Set as Home Mosque',
                  icon: Icons.check_circle_outline,
                  onPressed: () {
                    ref.read(selectedMosqueProvider.notifier).state =
                        selectedMosque;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          '${selectedMosque.name} set as your active mosque.',
                        ),
                      ),
                    );
                    Navigator.of(context).pop();
                  },
                ),
              ],
            ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(width: 12),
          Text(
            '$label: ',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(color: Colors.grey.shade800),
            ),
          ),
        ],
      ),
    );
  }
}
