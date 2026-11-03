import 'package:geolocator/geolocator.dart';
import 'package:salah_near/core/constants/app_constants.dart';
import 'package:salah_near/core/utils/logger.dart';

class LocationService {
  Future<bool> checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  Future<Position> getCurrentLocation() async {
    try {
      final hasPermission = await checkPermission();
      if (!hasPermission) {
        AppLogger.debug('Location permission denied, using default Kerala coordinates');
        return _fallbackPosition();
      }

      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
    } catch (e, stack) {
      AppLogger.error('Failed to get current GPS location', error: e, stackTrace: stack);
      return _fallbackPosition();
    }
  }

  double calculateDistanceInMeters({
    required double startLatitude,
    required double startLongitude,
    required double endLatitude,
    required double endLongitude,
  }) {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
  }

  bool isWithinMosqueRadius({
    required double userLat,
    required double userLng,
    required double mosqueLat,
    required double mosqueLng,
    int radiusMeters = AppConstants.defaultAttendanceRadiusMeters,
  }) {
    final distance = calculateDistanceInMeters(
      startLatitude: userLat,
      startLongitude: userLng,
      endLatitude: mosqueLat,
      endLongitude: mosqueLng,
    );
    return distance <= radiusMeters;
  }

  Position _fallbackPosition() {
    return Position(
      latitude: AppConstants.defaultKeralaLatitude,
      longitude: AppConstants.defaultKeralaLongitude,
      timestamp: DateTime.now(),
      accuracy: 100.0,
      altitude: 0.0,
      altitudeAccuracy: 0.0,
      heading: 0.0,
      headingAccuracy: 0.0,
      speed: 0.0,
      speedAccuracy: 0.0,
    );
  }
}
