import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'package:salah_near/core/utils/logger.dart';

final notificationServiceProvider = Provider<NotificationService>((ref) {
  final service = NotificationService();
  service.initialize();
  return service;
});

class NotificationService {
  final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      tz.initializeTimeZones();
      try {
        tz.setLocalLocation(tz.getLocation('Asia/Kolkata'));
      } catch (_) {
        AppLogger.debug('Local location fallback used.');
      }

      const androidSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _notificationsPlugin.initialize(
        settings: initSettings,
        onDidReceiveNotificationResponse: (response) {
          AppLogger.info('Notification tapped: ${response.payload}');
        },
      );

      _isInitialized = true;
      AppLogger.info('NotificationService successfully initialized.');
    } catch (e, stack) {
      AppLogger.error('Failed to initialize NotificationService',
          error: e, stackTrace: stack);
    }
  }

  Future<void> schedulePrayerReminder({
    required int id,
    required String prayerName,
    required DateTime prayerTime,
    int offsetMinutes = 0,
    String? mosqueName,
  }) async {
    if (!_isInitialized) await initialize();

    try {
      final scheduledInstant =
          prayerTime.subtract(Duration(minutes: offsetMinutes));
      final scheduledDate = tz.TZDateTime.from(scheduledInstant, tz.local);
      if (scheduledDate.isBefore(tz.TZDateTime.now(tz.local))) {
        return; // Do not schedule past notifications
      }

      const androidDetails = AndroidNotificationDetails(
        'salah_reminders_channel',
        'Salah Reminders',
        channelDescription:
            'Notifications for upcoming prayer times and congregation calls',
        importance: Importance.high,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const details = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      final title = offsetMinutes > 0
          ? '$prayerName in $offsetMinutes minutes'
          : '$prayerName Prayer Time';

      final body = mosqueName != null
          ? 'Congregational prayer at $mosqueName'
          : 'It is time for $prayerName prayer';

      await _notificationsPlugin.zonedSchedule(
        id: id,
        title: title,
        body: body,
        scheduledDate: scheduledDate,
        notificationDetails: details,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      );

      AppLogger.info(
          'Scheduled reminder for $prayerName at $scheduledDate (offset: $offsetMinutes min)');
    } catch (e, stack) {
      AppLogger.error('Failed to schedule reminder for $prayerName',
          error: e, stackTrace: stack);
    }
  }

  Future<void> showTestNotification({
    required String title,
    required String body,
  }) async {
    if (!_isInitialized) await initialize();

    const androidDetails = AndroidNotificationDetails(
      'salah_test_channel',
      'Salah Test Notifications',
      channelDescription: 'Channel for audio and reminder test triggers',
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notificationsPlugin.show(
      id: 9999,
      title: title,
      body: body,
      notificationDetails: details,
    );
  }

  Future<void> cancelAll() async {
    await _notificationsPlugin.cancelAll();
  }
}
