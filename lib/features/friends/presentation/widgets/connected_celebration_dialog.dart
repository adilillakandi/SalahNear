import 'package:confetti/confetti.dart';
import 'package:flutter/material.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/features/friends/domain/entities/friend_encounter_entity.dart';
import 'package:salah_near/shared/widgets/app_button.dart';

class ConnectedCelebrationDialog extends StatefulWidget {
  final FriendEncounterEntity encounter;

  const ConnectedCelebrationDialog({super.key, required this.encounter});

  static Future<void> show(
      BuildContext context, FriendEncounterEntity encounter) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => ConnectedCelebrationDialog(encounter: encounter),
    );
  }

  @override
  State<ConnectedCelebrationDialog> createState() =>
      _ConnectedCelebrationDialogState();
}

class _ConnectedCelebrationDialogState
    extends State<ConnectedCelebrationDialog> {
  late ConfettiController _confetti;

  @override
  void initState() {
    super.initState();
    _confetti = ConfettiController(duration: const Duration(seconds: 4));
    _confetti.play();
  }

  @override
  void dispose() {
    _confetti.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          contentPadding: const EdgeInsets.all(28),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Two Connecting Avatars
              SizedBox(
                height: 80,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Positioned(
                      left: 30,
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 3),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.15),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: const CircleAvatar(
                          radius: 32,
                          backgroundColor: AppColors.primary,
                          child: Icon(Icons.person, color: Colors.white, size: 36),
                        ),
                      ),
                    ),
                    Positioned(
                      right: 30,
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 3),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.15),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: CircleAvatar(
                          radius: 32,
                          backgroundColor: AppColors.secondary,
                          child: Text(
                            widget.encounter.friendName.substring(0, 1).toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                    // Handshake Badge
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(color: Colors.black26, blurRadius: 6),
                        ],
                      ),
                      child: const Icon(
                        Icons.handshake,
                        color: AppColors.primary,
                        size: 24,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Title
              const Text(
                'YES! CONNECTED!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: AppColors.primary,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(height: 8),

              Text(
                'You and ${widget.encounter.friendName} met during ${widget.encounter.prayerType.displayName} at ${widget.encounter.mosqueName}!',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),

              // Friendship Milestone Box
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.secondaryContainer.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: AppColors.secondary.withValues(alpha: 0.5),
                  ),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.workspace_premium,
                        color: AppColors.secondaryDark, size: 24),
                    SizedBox(width: 8),
                    Text(
                      '+10 Fellowship Bonus Points!',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.secondaryDark,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              AppButton(
                text: 'Alhamdulillah! Continue',
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ),
        Align(
          alignment: Alignment.topCenter,
          child: ConfettiWidget(
            confettiController: _confetti,
            blastDirectionality: BlastDirectionality.explosive,
            shouldLoop: false,
            colors: const [
              AppColors.primary,
              AppColors.secondary,
              Colors.amber,
              Colors.teal,
            ],
          ),
        ),
      ],
    );
  }
}

