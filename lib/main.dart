import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/bootstrap.dart';
import 'package:salah_near/core/constants/app_constants.dart';
import 'package:salah_near/core/theme/app_theme.dart';
import 'package:salah_near/routing/app_router.dart';

void main() async {
  await bootstrap(() => const SalahNearApp());
}

class SalahNearApp extends ConsumerWidget {
  const SalahNearApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
