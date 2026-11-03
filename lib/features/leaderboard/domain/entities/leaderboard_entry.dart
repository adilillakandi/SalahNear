class LeaderboardEntry {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final int totalPoints;
  final int rank;
  final int currentStreakDays;
  final String? preferredMosqueName;
  final bool isCurrentUser;

  const LeaderboardEntry({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    required this.totalPoints,
    required this.rank,
    this.currentStreakDays = 0,
    this.preferredMosqueName,
    this.isCurrentUser = false,
  });
}

