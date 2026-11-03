import 'package:salah_near/features/mosques/domain/entities/mosque_entity.dart';

class MosqueModel extends MosqueEntity {
  const MosqueModel({
    required super.id,
    required super.name,
    super.alternateName,
    super.address,
    super.cityOrLocality,
    required super.district,
    super.state,
    super.pincode,
    required super.latitude,
    required super.longitude,
    super.verificationStatus,
    super.attendanceRadiusMeters,
    super.distanceMeters,
    super.isActive,
  });

  factory MosqueModel.fromJson(Map<String, dynamic> json) {
    double lat = 0.0;
    double lng = 0.0;

    // Handle PostGIS geography GeoJSON or point representation
    if (json['location'] != null && json['location'] is Map) {
      final coordinates = json['location']['coordinates'] as List?;
      if (coordinates != null && coordinates.length >= 2) {
        lng = (coordinates[0] as num).toDouble();
        lat = (coordinates[1] as num).toDouble();
      }
    } else {
      lat = (json['latitude'] as num?)?.toDouble() ?? 0.0;
      lng = (json['longitude'] as num?)?.toDouble() ?? 0.0;
    }

    return MosqueModel(
      id: json['id'] as String,
      name: json['name'] as String,
      alternateName: json['alternate_name'] as String?,
      address: json['address'] as String?,
      cityOrLocality: json['city_or_locality'] as String?,
      district: json['district'] as String? ?? 'Kerala',
      state: json['state'] as String? ?? 'Kerala',
      pincode: json['pincode'] as String?,
      latitude: lat,
      longitude: lng,
      verificationStatus: json['verification_status'] as String? ?? 'verified',
      attendanceRadiusMeters: json['attendance_radius_m'] as int? ?? 100,
      distanceMeters: (json['distance_m'] as num?)?.toDouble(),
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'alternate_name': alternateName,
      'address': address,
      'city_or_locality': cityOrLocality,
      'district': district,
      'state': state,
      'pincode': pincode,
      'latitude': latitude,
      'longitude': longitude,
      'verification_status': verificationStatus,
      'attendance_radius_m': attendanceRadiusMeters,
      'is_active': isActive,
    };
  }
}
