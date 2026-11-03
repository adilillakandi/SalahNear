import 'package:intl/intl.dart';

extension DateTimeExtensions on DateTime {
  String toPrayerTimeString() {
    return DateFormat('h:mm a').format(this);
  }

  String toFormattedDate() {
    return DateFormat('EEE, d MMM y').format(this);
  }

  String toIsoDateOnly() {
    return DateFormat('yyyy-MM-dd').format(this);
  }

  bool isSameDay(DateTime other) {
    return year == other.year && month == other.month && day == other.day;
  }
}

