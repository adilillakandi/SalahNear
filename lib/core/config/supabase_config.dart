import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:salah_near/core/config/env_config.dart';

class SupabaseConfig {
  SupabaseConfig._();

  static SupabaseClient get client => Supabase.instance.client;

  static Future<void> initialize() async {
    try {
      if (EnvConfig.supabaseUrl.contains('placeholder')) {
        debugPrint(
          '[SupabaseConfig] Warning: Running with placeholder Supabase credentials.',
        );
        return;
      }

      await Supabase.initialize(
        url: EnvConfig.supabaseUrl,
        publishableKey: EnvConfig.supabasePublishableKey.isNotEmpty
            ? EnvConfig.supabasePublishableKey
            : EnvConfig.supabaseAnonKey,
        authOptions: const FlutterAuthClientOptions(
          autoRefreshToken: true,
        ),
      );
      debugPrint('[SupabaseConfig] Supabase successfully initialized with project: ${EnvConfig.supabaseUrl}');
    } catch (e, stack) {
      debugPrint('[SupabaseConfig] Failed to initialize Supabase: $e\n$stack');
    }
  }
}
