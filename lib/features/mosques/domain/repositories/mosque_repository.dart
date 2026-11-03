import 'package:salah_near/features/mosques/domain/entities/mosque_entity.dart';

abstract class MosqueRepository {
  Future<List<MosqueEntity>> getNearbyMosques({
    required double latitude,
    required double longitude,
    int radiusMeters = 5000,
  });

  Future<MosqueEntity?> getMosqueById(String id);

  Future<List<MosqueEntity>> searchMosques(String query, {String? district});

  Future<Map<String, String>> getMosqueIqamahSchedule(String mosqueId);

  Future<bool> updateMosqueIqamahSchedule({
    required String mosqueId,
    required Map<String, String> iqamahTimes,
  });
}
