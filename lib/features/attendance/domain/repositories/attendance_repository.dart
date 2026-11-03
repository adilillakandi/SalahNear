import 'dart:io';
import 'package:salah_near/features/attendance/domain/entities/attendance_submission.dart';

abstract class AttendanceRepository {
  Future<AttendanceSubmission> submitAttendance({
    required AttendanceSubmission submission,
    File? evidencePhoto,
  });

  Future<List<AttendanceSubmission>> getUserAttendanceHistory({
    int limit = 30,
    int offset = 0,
  });

  Future<bool> hasAlreadyCheckedIn({
    required String prayerType,
    required DateTime date,
  });
}
