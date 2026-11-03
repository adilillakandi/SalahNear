import 'package:flutter/material.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/core/extensions/datetime_extensions.dart';
import 'package:salah_near/features/prayer_times/domain/entities/prayer_time_entry.dart';

class PrayerTimeRow extends StatelessWidget {
  final PrayerTimeEntry prayer;
  final VoidCallback? onAttendancePressed;

  const PrayerTimeRow({
    super.key,
    required this.prayer,
    this.onAttendancePressed,
  });

  @override
  Widget build(BuildContext context) {
    final isHighlighted = prayer.isCurrent || prayer.isNext;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isHighlighted
            ? AppColors.primaryContainer.withAlpha(120)
            : Theme.of(context).cardTheme.color,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isHighlighted
              ? AppColors.primaryLight.withAlpha(150)
              : Theme.of(context).dividerTheme.color ?? Colors.grey.shade200,
          width: isHighlighted ? 1.5 : 1.0,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isHighlighted ? AppColors.primary : Colors.grey.shade400,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      prayer.displayName,
                      style: TextStyle(
                        fontWeight:
                            isHighlighted ? FontWeight.bold : FontWeight.w600,
                        fontSize: 15,
                        color: isHighlighted ? AppColors.primaryDark : null,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      prayer.arabicName,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    if (prayer.isNext) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'NEXT',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                if (prayer.iqamahTime != null)
                  Text(
                    'Iqamah: ${prayer.iqamahTime!.toPrayerTimeString()}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
              ],
            ),
          ),
          Text(
            prayer.startTime.toPrayerTimeString(),
            style: TextStyle(
              fontSize: 16,
              fontWeight: isHighlighted ? FontWeight.bold : FontWeight.w600,
              color: isHighlighted ? AppColors.primaryDark : null,
            ),
          ),
        ],
      ),
    );
  }
}
