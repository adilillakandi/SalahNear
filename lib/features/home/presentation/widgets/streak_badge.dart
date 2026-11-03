import 'package:flutter/material.dart';
import 'package:salah_near/core/constants/app_colors.dart';

class StreakBadge extends StatelessWidget {
  final int streakDays;
  final int totalPoints;
  final VoidCallback? onTap;

  const StreakBadge({
    super.key,
    required this.streakDays,
    required this.totalPoints,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.secondaryContainer.withAlpha(200),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.secondaryDark.withAlpha(80)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.local_fire_department,
              color: AppColors.streakFire,
              size: 20,
            ),
            const SizedBox(width: 4),
            Text(
              '$streakDays Days',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: AppColors.onSecondaryContainer,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              width: 1,
              height: 14,
              color: AppColors.secondaryDark.withAlpha(100),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.stars_rounded,
              color: AppColors.pointsGold,
              size: 18,
            ),
            const SizedBox(width: 4),
            Text(
              '$totalPoints pts',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: AppColors.onSecondaryContainer,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
