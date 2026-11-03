class AppException implements Exception {
  final String message;
  final String? code;
  final dynamic details;

  const AppException(this.message, {this.code, this.details});

  @override
  String toString() => 'AppException: $message (code: $code)';
}

class LocationException extends AppException {
  const LocationException(super.message, {super.code, super.details});
}

class AttendanceException extends AppException {
  const AttendanceException(super.message, {super.code, super.details});
}

class AuthExceptionWrapper extends AppException {
  const AuthExceptionWrapper(super.message, {super.code, super.details});
}

class NetworkException extends AppException {
  const NetworkException(super.message, {super.code, super.details});
}
