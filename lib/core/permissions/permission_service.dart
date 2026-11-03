import 'package:permission_handler/permission_handler.dart';
import '../utils/logger.dart';

class PermissionService {
  Future<bool> requestLocationPermission() async {
    final status = await Permission.locationWhenInUse.request();
    AppLogger.info('Location permission status: $status');
    return status.isGranted;
  }

  Future<bool> requestCameraPermission() async {
    final status = await Permission.camera.request();
    AppLogger.info('Camera permission status: $status');
    return status.isGranted;
  }

  Future<bool> requestNotificationPermission() async {
    final status = await Permission.notification.request();
    AppLogger.info('Notification permission status: $status');
    return status.isGranted;
  }

  Future<bool> hasCameraPermission() async {
    return await Permission.camera.isGranted;
  }

  Future<bool> hasLocationPermission() async {
    return await Permission.locationWhenInUse.isGranted;
  }
}
