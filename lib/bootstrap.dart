import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/core/config/supabase_config.dart';
import 'package:salah_near/core/services/notification_service.dart';
import 'package:salah_near/core/utils/logger.dart';

Future<void> bootstrap(Widget Function() builder) async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase client
  await SupabaseConfig.initialize();

  // Initialize local notifications service
  final notificationService = NotificationService();
  await notificationService.initialize();

  // Global uncaught Flutter error handler
  FlutterError.onError = (details) {
    AppLogger.error(
      'Flutter Uncaught Error',
      error: details.exception,
      stackTrace: details.stack,
    );
  };

  runApp(
    ProviderScope(
      observers: [
        _AppProviderObserver(),
      ],
      child: builder(),
    ),
  );
}

class _AppProviderObserver extends ProviderObserver {
  @override
  void didUpdateProvider(
    ProviderBase<Object?> provider,
    Object? previousValue,
    Object? newValue,
    ProviderContainer container,
  ) {
    AppLogger.debug(
      '[Riverpod] ${provider.name ?? provider.runtimeType} updated',
    );
  }
}
