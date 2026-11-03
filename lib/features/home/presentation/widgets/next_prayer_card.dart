import 'package:flutter/material.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/core/extensions/datetime_extensions.dart';
import 'package:salah_near/features/prayer_times/domain/entities/prayer_time_entry.dart';

class NextPrayerCard extends StatelessWidget {
  final PrayerTimeEntry? nextPrayer;
  final Duration? remainingTime;
  final String? mosqueName;
  final VoidCallback? onCheckInPressed;

  const NextPrayerCard({
    super.key,
    this.nextPrayer,
    this.remainingTime,
    this.mosqueName,
    this.onCheckInPressed,
  });

  @override
  Widget build(BuildContext context) {
    final next = nextPrayer;
    if (next == null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Center(
          child: Text(
            'Calculating prayer times...',
            style: TextStyle(color: Colors.white),
          ),
        ),
      );
    }

    final hours = remainingTime != null ? remainingTime!.inHours : 0;
    final minutes =
        remainingTime != null ? remainingTime!.inMinutes.remainder(60) : 0;
    final seconds =
        remainingTime != null ? remainingTime!.inSeconds.remainder(60) : 0;

    final countdownString = remainingTime != null
        ? '${hours.toString().padLeft(2, '0')}:${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}'
        : '--:--:--';

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primaryDark, AppColors.primary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withAlpha(80),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'NEXT PRAYER',
                    style: TextStyle(
                      color: AppColors.secondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        next.displayName,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        next.arabicName,
                        style: TextStyle(
                          color: Colors.white.withAlpha(180),
                          fontSize: 22,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha(30),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.mosque,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Starts at ${next.startTime.toPrayerTimeString()}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (next.iqamahTime != null)
                    Text(
                      'Iqamah: ${next.iqamahTime!.toPrayerTimeString()}',
                      style: TextStyle(
                        color: Colors.white.withAlpha(200),
                        fontSize: 13,
                      ),
                    ),
                  if (mosqueName != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(
                          Icons.location_on,
                          size: 14,
                          color: AppColors.secondaryLight,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          mosqueName!,
                          style: TextStyle(
                            color: Colors.white.withAlpha(220),
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black.withAlpha(60),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withAlpha(40)),
                ),
                child: Column(
                  children: [
                    Text(
                      countdownString,
                      style: const TextStyle(
                        color: AppColors.secondaryLight,
                        fontSize: 16,
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Text(
                      'remaining',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: onCheckInPressed,
            icon: const Icon(Icons.qr_code_scanner, size: 20),
            label: Text('Check In to ${next.displayName} (+${next.basePoints} pts)'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.secondary,
              foregroundColor: Colors.black,
              minimumSize: const Size(double.infinity, 44),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              textStyle: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
