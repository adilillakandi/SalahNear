import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/features/friends/domain/entities/friend_encounter_entity.dart';
import 'package:salah_near/features/friends/presentation/providers/friends_provider.dart';
import 'package:salah_near/features/friends/presentation/widgets/connected_celebration_dialog.dart';

class EncounterCard extends ConsumerWidget {
  final FriendEncounterEntity encounter;

  const EncounterCard({super.key, required this.encounter});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hasAnswered = encounter.myResponse != EncounterResponseState.pending;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.secondaryContainer.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.secondary.withValues(alpha: 0.6),
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.hub, color: Colors.white, size: 14),
                    SizedBox(width: 4),
                    Text(
                      'SHARED CONGREGATION ENCOUNTER',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                '${encounter.prayerType.displayName} Prayer',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.primary,
                child: Text(
                  encounter.friendName.substring(0, 1).toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Your companion ${encounter.friendName} was also at ${encounter.mosqueName}!',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: AppColors.textPrimary,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Did you meet or pray together?',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          if (!hasAnswered)
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.handshake, size: 18),
                    label: const Text('Yes, we connected'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    onPressed: () async {
                      final updated = await ref
                          .read(friendsNotifierProvider.notifier)
                          .respondToEncounter(
                            encounterId: encounter.id,
                            metFriend: true,
                          );
                      if (context.mounted &&
                          updated != null &&
                          updated.isMutualConnected) {
                        ConnectedCelebrationDialog.show(context, updated);
                      }
                    },
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                  ),
                  onPressed: () {
                    ref
                        .read(friendsNotifierProvider.notifier)
                        .respondToEncounter(
                          encounterId: encounter.id,
                          metFriend: false,
                        );
                  },
                  child: const Text('No, didn\'t meet'),
                ),
              ],
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    encounter.myResponse == EncounterResponseState.yes
                        ? Icons.check_circle
                        : Icons.close,
                    color: encounter.myResponse == EncounterResponseState.yes
                        ? AppColors.primary
                        : Colors.grey,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    encounter.myResponse == EncounterResponseState.yes
                        ? 'You confirmed connection (+10 pts when mutual)'
                        : 'Response recorded',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
