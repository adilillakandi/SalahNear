import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/env_config.dart';

final supabaseClientProvider = Provider<SupabaseClient?>((ref) {
  try {
    if (EnvConfig.supabaseUrl.contains('placeholder')) {
      return null;
    }
    return Supabase.instance.client;
  } catch (_) {
    return null;
  }
});

final currentUserIdProvider = Provider<String?>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return client?.auth.currentUser?.id;
});

final isUserAuthenticatedProvider = Provider<bool>((ref) {
  final client = ref.watch(supabaseClientProvider);
  return client?.auth.currentUser != null;
});

