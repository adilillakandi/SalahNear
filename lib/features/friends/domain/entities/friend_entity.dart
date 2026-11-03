enum FriendshipStatus {
  pending,
  accepted,
  blocked;

  static FriendshipStatus fromString(String? val) {
    switch (val?.toLowerCase()) {
      case 'accepted':
        return FriendshipStatus.accepted;
      case 'blocked':
        return FriendshipStatus.blocked;
      default:
        return FriendshipStatus.pending;
    }
  }
}

class FriendEntity {
  final String id;
  final String friendUserId;
  final String friendName;
  final String friendUsername;
  final String? friendAvatarUrl;
  final String? district;
  final int totalPoints;
  final int currentStreak;
  final FriendshipStatus status;
  final DateTime createdAt;

  const FriendEntity({
    required this.id,
    required this.friendUserId,
    required this.friendName,
    required this.friendUsername,
    this.friendAvatarUrl,
    this.district,
    this.totalPoints = 0,
    this.currentStreak = 0,
    this.status = FriendshipStatus.accepted,
    required this.createdAt,
  });

  factory FriendEntity.fromJson(Map<String, dynamic> json) {
    return FriendEntity(
      id: json['id'] as String,
      friendUserId: json['friend_user_id'] as String,
      friendName: json['friend_name'] as String? ?? 'Salah Companion',
      friendUsername: json['friend_username'] as String? ?? 'companion',
      friendAvatarUrl: json['friend_avatar_url'] as String?,
      district: json['district'] as String?,
      totalPoints: (json['total_points'] as num?)?.toInt() ?? 0,
      currentStreak: (json['current_streak'] as num?)?.toInt() ?? 0,
      status: FriendshipStatus.fromString(json['status'] as String?),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
    );
  }
}
