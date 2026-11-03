import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/core/network/supabase_client_provider.dart';
import 'package:salah_near/features/prayer_times/presentation/providers/prayer_times_provider.dart';
import 'package:salah_near/features/mosques/domain/entities/mosque_entity.dart';
import 'package:salah_near/features/mosques/domain/repositories/mosque_repository.dart';
import 'package:salah_near/features/mosques/data/repositories/mosque_repository_impl.dart';

final mosqueRepositoryProvider = Provider<MosqueRepository>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  return MosqueRepositoryImpl(supabaseClient: supabase);
});

// Currently selected/home mosque for the user
final selectedMosqueProvider = StateProvider<MosqueEntity?>((ref) => null);

// Search query provider
final mosqueSearchQueryProvider = StateProvider<String>((ref) => '');

// Nearby mosques based on current location
final nearbyMosquesProvider = FutureProvider<List<MosqueEntity>>((ref) async {
  final repository = ref.watch(mosqueRepositoryProvider);
  final positionAsync = await ref.watch(userLocationProvider.future);

  return repository.getNearbyMosques(
    latitude: positionAsync.latitude,
    longitude: positionAsync.longitude,
  );
});

// Search results provider
final searchedMosquesProvider = FutureProvider<List<MosqueEntity>>((ref) async {
  final query = ref.watch(mosqueSearchQueryProvider);
  if (query.trim().isEmpty) {
    return ref.watch(nearbyMosquesProvider.future);
  }
  final repository = ref.watch(mosqueRepositoryProvider);
  return repository.searchMosques(query);
});
