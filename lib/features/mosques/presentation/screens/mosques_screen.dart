import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/shared/widgets/app_loading_indicator.dart';
import 'package:salah_near/shared/widgets/empty_state_view.dart';
import 'package:salah_near/features/mosques/presentation/providers/mosque_provider.dart';

class MosquesScreen extends ConsumerWidget {
  const MosquesScreen({super.key});

  static const List<String> _districts = [
    'All',
    'Kozhikode',
    'Malappuram',
    'Kannur',
    'Wayanad',
    'Palakkad',
    'Thrissur',
    'Ernakulam',
    'Idukki',
    'Kottayam',
    'Alappuzha',
    'Pathanamthitta',
    'Kollam',
    'Thiruvananthapuram',
    'Kasaragod',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mosquesAsync = ref.watch(searchedMosquesProvider);
    final selectedMosque = ref.watch(selectedMosqueProvider);
    final selectedDistrict = ref.watch(selectedDistrictFilterProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kerala Mosques Directory'),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search mosque name, palli, or town...',
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

          // District Filter Chips
          SizedBox(
            height: 44,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _districts.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final dist = _districts[index];
                final isSelected = selectedDistrict == dist;
                return ChoiceChip(
                  label: Text(dist),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  labelStyle: TextStyle(
                    fontSize: 12,
                    color: isSelected ? Colors.white : Colors.black87,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                  onSelected: (selected) {
                    if (selected) {
                      ref.read(selectedDistrictFilterProvider.notifier).state =
                          dist;
                    }
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          const Divider(height: 1),

          Expanded(
            child: mosquesAsync.when(
              data: (mosques) {
                if (mosques.isEmpty) {
                  return const EmptyStateView(
                    icon: Icons.mosque_outlined,
                    title: 'No Mosques Found',
                    subtitle: 'Try adjusting your search query or district filter.',
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.all(16),
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
                        contentPadding: const EdgeInsets.all(14),
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
                              Text(
                                mosque.address!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.near_me,
                                    size: 13, color: AppColors.secondaryDark),
                                const SizedBox(width: 4),
                                Text(
                                  mosque.formattedDistance.isNotEmpty
                                      ? mosque.formattedDistance
                                      : 'Nearby',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.secondaryDark,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  mosque.district,
                                  style: const TextStyle(
                                      fontSize: 12, color: Colors.grey),
                                ),
                              ],
                            ),
                          ],
                        ),
                        trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                        onTap: () {
                          ref.read(selectedMosqueProvider.notifier).state = mosque;
                          context.push('/mosques/${mosque.id}');
                        },
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: AppLoadingIndicator()),
              error: (err, stack) => Center(
                child: Text('Error loading mosques: $err'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
