import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:salah_near/features/attendance/presentation/screens/attendance_history_screen.dart';
import 'package:salah_near/features/attendance/presentation/screens/attendance_screen.dart';
import 'package:salah_near/features/authentication/presentation/screens/login_screen.dart';
import 'package:salah_near/features/friends/presentation/screens/friends_screen.dart';
import 'package:salah_near/features/home/presentation/screens/home_screen.dart';
import 'package:salah_near/features/home/presentation/screens/main_shell_screen.dart';
import 'package:salah_near/features/leaderboard/presentation/screens/leaderboard_screen.dart';
import 'package:salah_near/features/mosques/presentation/screens/mosque_detail_screen.dart';
import 'package:salah_near/features/mosques/presentation/screens/mosques_screen.dart';
import 'package:salah_near/features/prayer_times/presentation/screens/prayer_times_screen.dart';
import 'package:salah_near/features/profile/presentation/screens/profile_screen.dart';
import 'package:salah_near/features/settings/presentation/screens/settings_screen.dart';
import 'package:salah_near/routing/app_routes.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'root');
final GlobalKey<NavigatorState> _shellNavigatorKey =
    GlobalKey<NavigatorState>(debugLabel: 'shell');

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoutes.home,
    routes: [
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) {
          return MainShellScreen(child: child);
        },
        routes: [
          GoRoute(
            path: AppRoutes.home,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomeScreen(),
            ),
          ),
          GoRoute(
            path: AppRoutes.prayerTimes,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: PrayerTimesScreen(),
            ),
          ),
          GoRoute(
            path: AppRoutes.mosques,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: MosquesScreen(),
            ),
          ),
          GoRoute(
            path: AppRoutes.leaderboard,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: LeaderboardScreen(),
            ),
          ),
          GoRoute(
            path: AppRoutes.profile,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfileScreen(),
            ),
          ),
        ],
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.mosqueDetail,
        builder: (context, state) {
          final mosqueId = state.pathParameters['mosqueId'] ?? '';
          return MosqueDetailScreen(mosqueId: mosqueId);
        },
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.attendance,
        builder: (context, state) => const AttendanceScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.attendanceHistory,
        builder: (context, state) => const AttendanceHistoryScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.friends,
        builder: (context, state) => const FriendsScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        parentNavigatorKey: _rootNavigatorKey,
        path: AppRoutes.settings,
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
  );
});
