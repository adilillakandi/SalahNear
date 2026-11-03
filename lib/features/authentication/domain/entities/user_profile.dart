class UserProfile {
  final String id;
  final String fullName;
  final String? username;
  final String? avatarUrl;
  final String? district;
  final String state;
  final String? homeMosqueId;
  final String? homeMosqueName;
  final int totalPoints;
  final int currentStreak;
  final bool hasCompletedOnboarding;

  const UserProfile({
    required this.id,
    required this.fullName,
    this.username,
    this.avatarUrl,
    this.district,
    this.state = 'Kerala',
    this.homeMosqueId,
    this.homeMosqueName,
    this.totalPoints = 0,
    this.currentStreak = 0,
    this.hasCompletedOnboarding = false,
  });

  UserProfile copyWith({
    String? id,
    String? fullName,
    String? username,
    String? avatarUrl,
    String? district,
    String? state,
    String? homeMosqueId,
    String? homeMosqueName,
    int? totalPoints,
    int? currentStreak,
    bool? hasCompletedOnboarding,
  }) {
    return UserProfile(
      id: id ?? this.id,
      fullName: fullName ?? this.fullName,
      username: username ?? this.username,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      district: district ?? this.district,
      state: state ?? this.state,
      homeMosqueId: homeMosqueId ?? this.homeMosqueId,
      homeMosqueName: homeMosqueName ?? this.homeMosqueName,
      totalPoints: totalPoints ?? this.totalPoints,
      currentStreak: currentStreak ?? this.currentStreak,
      hasCompletedOnboarding:
          hasCompletedOnboarding ?? this.hasCompletedOnboarding,
    );
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      fullName: json['full_name'] as String? ?? 'Community Member',
      username: json['username'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      district: json['district'] as String?,
      state: json['state'] as String? ?? 'Kerala',
      homeMosqueId: json['home_mosque_id'] as String?,
      homeMosqueName: json['home_mosque_name'] as String?,
      totalPoints: (json['total_points'] as num?)?.toInt() ?? 0,
      currentStreak: (json['current_streak'] as num?)?.toInt() ?? 0,
      hasCompletedOnboarding: json['district'] != null && json['username'] != null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'full_name': fullName,
      'username': username,
      'avatar_url': avatarUrl,
      'district': district,
      'state': state,
      'home_mosque_id': homeMosqueId,
    };
  }
}
