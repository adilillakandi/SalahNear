import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:salah_near/core/utils/logger.dart';
import 'package:salah_near/features/mosques/domain/entities/mosque_entity.dart';
import 'package:salah_near/features/mosques/domain/repositories/mosque_repository.dart';
import 'package:salah_near/features/mosques/data/models/mosque_model.dart';

class MosqueRepositoryImpl implements MosqueRepository {
  final SupabaseClient? supabaseClient;

  MosqueRepositoryImpl({this.supabaseClient});

  @override
  Future<List<MosqueEntity>> getNearbyMosques({
    required double latitude,
    required double longitude,
    int radiusMeters = 5000,
  }) async {
    final client = supabaseClient;
    if (client == null) {
      return _getSampleKeralaMosques(latitude, longitude);
    }

    try {
      final response = await client.rpc(
        'nearby_mosques',
        params: {
          'user_lat': latitude,
          'user_lng': longitude,
          'radius_m': radiusMeters,
        },
      ) as List<dynamic>;

      return response
          .map((json) => MosqueModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e, stack) {
      AppLogger.error('Failed to query nearby mosques from Supabase', error: e, stackTrace: stack);
      return _getSampleKeralaMosques(latitude, longitude);
    }
  }

  @override
  Future<MosqueEntity?> getMosqueById(String id) async {
    final client = supabaseClient;
    if (client == null) {
      final sample = _getSampleKeralaMosques(11.2588, 75.7804);
      try {
        return sample.firstWhere((m) => m.id == id);
      } catch (_) {
        return null;
      }
    }

    try {
      final response = await client
          .from('mosques')
          .select()
          .eq('id', id)
          .maybeSingle();

      if (response == null) return null;
      return MosqueModel.fromJson(response);
    } catch (e, stack) {
      AppLogger.error('Failed to get mosque by ID', error: e, stackTrace: stack);
      return null;
    }
  }

  @override
  Future<List<MosqueEntity>> searchMosques(String query) async {
    final client = supabaseClient;
    if (client == null) {
      final sample = _getSampleKeralaMosques(11.2588, 75.7804);
      return sample
          .where((m) => m.name.toLowerCase().contains(query.toLowerCase()))
          .toList();
    }

    try {
      final response = await client
          .from('mosques')
          .select()
          .ilike('name', '%$query%')
          .limit(20) as List<dynamic>;

      return response
          .map((json) => MosqueModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e, stack) {
      AppLogger.error('Failed to search mosques', error: e, stackTrace: stack);
      return [];
    }
  }

  List<MosqueEntity> _getSampleKeralaMosques(double userLat, double userLng) {
    return const [
      MosqueEntity(
        id: '1',
        name: 'Mishkal Mosque (കുറ്റിച്ചിറ മിശ്കാൽ പള്ളി)',
        alternateName: 'Mishkal Palli',
        address: 'Kuttichira, Kozhikode',
        cityOrLocality: 'Kozhikode',
        district: 'Kozhikode',
        state: 'Kerala',
        latitude: 11.2425,
        longitude: 75.7766,
        distanceMeters: 1450,
        attendanceRadiusMeters: 120,
      ),
      MosqueEntity(
        id: '2',
        name: 'Cheraman Juma Mosque',
        alternateName: 'First Mosque in India',
        address: 'Methala, Kodungallur',
        cityOrLocality: 'Kodungallur',
        district: 'Thrissur',
        state: 'Kerala',
        latitude: 10.2163,
        longitude: 76.2001,
        distanceMeters: 4800,
        attendanceRadiusMeters: 150,
      ),
      MosqueEntity(
        id: '3',
        name: 'Kozhikode Town Juma Masjid',
        alternateName: 'Calicut Big Bazaar Mosque',
        address: 'Palayam, Kozhikode',
        cityOrLocality: 'Kozhikode',
        district: 'Kozhikode',
        state: 'Kerala',
        latitude: 11.2510,
        longitude: 75.7820,
        distanceMeters: 920,
        attendanceRadiusMeters: 100,
      ),
    ];
  }
}
