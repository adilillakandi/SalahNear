class MosqueEntity {
  final String id;
  final String name;
  final String? alternateName;
  final String? address;
  final String? cityOrLocality;
  final String district;
  final String state;
  final String? pincode;
  final double latitude;
  final double longitude;
  final String verificationStatus;
  final int attendanceRadiusMeters;
  final double? distanceMeters;
  final bool isActive;

  const MosqueEntity({
    required this.id,
    required this.name,
    this.alternateName,
    this.address,
    this.cityOrLocality,
    required this.district,
    this.state = 'Kerala',
    this.pincode,
    required this.latitude,
    required this.longitude,
    this.verificationStatus = 'verified',
    this.attendanceRadiusMeters = 100,
    this.distanceMeters,
    this.isActive = true,
  });

  String get formattedDistance {
    if (distanceMeters == null) return '';
    if (distanceMeters! < 1000) {
      return '${distanceMeters!.round()} m';
    }
    return '${(distanceMeters! / 1000).toStringAsFixed(1)} km';
  }
}

