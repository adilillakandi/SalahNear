import 'package:salah_near/core/constants/prayer_names.dart';

class PrayerTimeEntry {
  final PrayerType type;
  final DateTime startTime;
  final DateTime? iqamahTime;
  final bool isNext;
  final bool isCurrent;

  const PrayerTimeEntry({
    required this.type,
    required this.startTime,
    this.iqamahTime,
    this.isNext = false,
    this.isCurrent = false,
  });

  String get displayName => type.displayName;
  String get arabicName => type.arabicName;
  int get basePoints => type.basePoints;

  PrayerTimeEntry copyWith({
    PrayerType? type,
    DateTime? startTime,
    DateTime? iqamahTime,
    bool? isNext,
    bool? isCurrent,
  }) {
    return PrayerTimeEntry(
      type: type ?? this.type,
      startTime: startTime ?? this.startTime,
      iqamahTime: iqamahTime ?? this.iqamahTime,
      isNext: isNext ?? this.isNext,
      isCurrent: isCurrent ?? this.isCurrent,
    );
  }
}
