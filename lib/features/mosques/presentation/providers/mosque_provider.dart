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

// District filter provider ('All' or any Kerala district)
final selectedDistrictFilterProvider = StateProvider<String>((ref) => 'All');

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
  final district = ref.watch(selectedDistrictFilterProvider);
  final repository = ref.watch(mosqueRepositoryProvider);

  if (query.trim().isEmpty && (district == 'All')) {
    return ref.watch(nearbyMosquesProvider.future);
  }

  return repository.searchMosques(query, district: district);
});

// Mosque Iqamah Timetable Provider
final mosqueIqamahProvider =
    FutureProvider.family<Map<String, String>, String>((ref, mosqueId) async {
  final repository = ref.watch(mosqueRepositoryProvider);
  return repository.getMosqueIqamahSchedule(mosqueId);
});
