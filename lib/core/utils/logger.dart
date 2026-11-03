import 'dart:developer' as developer;

class AppLogger {
  AppLogger._();

  static void info(String message, {String? tag}) {
    developer.log(
      message,
      name: tag ?? 'SalahNear:INFO',
      level: 800,
    );
  }

  static void debug(String message, {String? tag}) {
    developer.log(
      message,
      name: tag ?? 'SalahNear:DEBUG',
      level: 500,
    );
  }

  static void warning(
    String message, {
    Object? error,
    StackTrace? stackTrace,
    String? tag,
  }) {
    developer.log(
      message,
      name: tag ?? 'SalahNear:WARN',
      level: 900,
      error: error,
      stackTrace: stackTrace,
    );
  }

  static void error(
    String message, {
    Object? error,
    StackTrace? stackTrace,
    String? tag,
  }) {
    developer.log(
      message,
      name: tag ?? 'SalahNear:ERROR',
      level: 1000,
      error: error,
      stackTrace: stackTrace,
    );
  }
}

