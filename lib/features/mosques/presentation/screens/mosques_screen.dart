import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/shared/widgets/app_loading_indicator.dart';
import 'package:salah_near/shared/widgets/empty_state_view.dart';
import 'package:salah_near/features/mosques/presentation/providers/mosque_provider.dart';

class MosquesScreen extends ConsumerWidget {
  const MosquesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mosquesAsync = ref.watch(searchedMosquesProvider);
    final selectedMosque = ref.watch(selectedMosqueProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kerala Mosques'),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search mosque name or locality...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onChanged: (val) {
                ref.read(mosqueSearchQueryProvider.notifier).state = val;
              },
            ),
          ),
          Expanded(
            child: mosquesAsync.when(
              data: (mosques) {
                if (mosques.isEmpty) {
                  return const EmptyStateView(
                    icon: Icons.mosque_outlined,
                    title: 'No Mosques Found',
                    subtitle: 'Try adjusting your search query or location.',
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: mosques.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final mosque = mosques[index];
                    final isSelected = selectedMosque?.id == mosque.id;

                    return Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: BorderSide(
                          color: isSelected
                              ? AppColors.primary
                              : Colors.grey.shade200,
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        leading: CircleAvatar(
                          backgroundColor: isSelected
                              ? AppColors.primary
                              : AppColors.primaryContainer,
                          child: Icon(
                            Icons.mosque,
                            color: isSelected ? Colors.white : AppColors.primary,
                          ),
                        ),
                        title: Text(
                          mosque.name,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (mosque.address != null) ...[
                              const SizedBox(height: 4),
                              Text(mosque.address!),
                            ],
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.near_me,
                                    size: 14, color: AppColors.secondaryDark),
                                const SizedBox(width: 4),
                                Text(
                                  mosque.formattedDistance.isNotEmpty
                                      ? mosque.formattedDistance
                                      : '${mosque.district}, Kerala',
                                  style: const TextStyle(
                                    color: AppColors.secondaryDark,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        trailing: ElevatedButton(
                          onPressed: () {
                            ref.read(selectedMosqueProvider.notifier).state =
                                mosque;
                            context.push('/mosques/${mosque.id}');
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isSelected
                                ? AppColors.success
                                : AppColors.primary,
                            minimumSize: const Size(70, 36),
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                          ),
                          child: Text(
                            isSelected ? 'Selected' : 'View',
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                      ),
                    );
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
}
