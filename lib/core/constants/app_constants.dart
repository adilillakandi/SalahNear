class AppConstants {
  AppConstants._();

  static const String appName = 'SalahNear';
  static const String appTagline = 'Never miss your prayer in congregation';

  // Default Kerala Location Coordinates (e.g. Kozhikode/Calicut central)
  static const double defaultKeralaLatitude = 11.2588;
  static const double defaultKeralaLongitude = 75.7804;
  static const String defaultTimezone = 'Asia/Kolkata';

  // Attendance & Verification Parameters (from integration guide)
  static const int defaultAttendanceRadiusMeters = 100;
  static const int maxAttendanceDistanceMeters = 300;
  static const int attendanceWindowBeforeMinutes = 15;
  static const int attendanceWindowAfterMinutes = 45;

  // Gamification Base Points
  static const int pointsFajr = 25;
  static const int pointsStandard = 20;
  static const int pointsJummahBonus = 10;
  static const int pointsStreakBonus3Days = 15;
  static const int pointsStreakBonus7Days = 35;
  static const int pointsStreakBonus30Days = 100;

  // Kerala Districts
  static const List<String> keralaDistricts = [
    'Alappuzha',
    'Ernakulam',
    'Idukki',
    'Kannur',
    'Kasaragod',
    'Kollam',
    'Kottayam',
    'Kozhikode',
    'Malappuram',
    'Palakkad',
    'Pathanamthitta',
    'Thiruvananthapuram',
    'Thrissur',
    'Wayanad',
  ];
}

