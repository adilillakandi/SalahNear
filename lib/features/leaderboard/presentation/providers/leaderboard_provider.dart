import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/core/network/supabase_client_provider.dart';
import 'package:salah_near/features/leaderboard/domain/entities/leaderboard_entry.dart';

enum LeaderboardScope {
  global,
  district,
  mosque,
}

final leaderboardScopeProvider = StateProvider<LeaderboardScope>((ref) {
  return LeaderboardScope.global;
});

final leaderboardProvider =
    FutureProvider<List<LeaderboardEntry>>((ref) async {
  final supabase = ref.watch(supabaseClientProvider);

  if (supabase == null) {
    // Demo Mock Leaderboard
    return const [
      LeaderboardEntry(
        userId: '1',
        displayName: 'Ahmad K.',
        totalPoints: 540,
        rank: 1,
        currentStreakDays: 28,
        preferredMosqueName: 'Mishkal Mosque',
      ),
      LeaderboardEntry(
        userId: '2',
        displayName: 'Bilal M.',
        totalPoints: 485,
        rank: 2,
        currentStreakDays: 21,
        preferredMosqueName: 'Kozhikode Town Juma',
      ),
      LeaderboardEntry(
        userId: '3',
        displayName: 'Omar Farooq',
        totalPoints: 420,
        rank: 3,
        currentStreakDays: 14,
        preferredMosqueName: 'Cheraman Juma Mosque',
      ),
      LeaderboardEntry(
        userId: 'current-user',
        displayName: 'You',
        totalPoints: 120,
        rank: 8,
        currentStreakDays: 4,
        preferredMosqueName: 'Mishkal Mosque',
        isCurrentUser: true,
      ),
    ];
  }

  // Supabase points_ledger query
  try {
    final response = await supabase
        .from('leaderboard_view')
        .select()
        .limit(50) as List<dynamic>;

    int currentRank = 1;
    return response.map((json) {
      return LeaderboardEntry(
        userId: json['user_id'] as String,
        displayName: json['display_name'] as String? ?? 'Brother/Sister',
        avatarUrl: json['avatar_url'] as String?,
        totalPoints: (json['total_points'] as num?)?.toInt() ?? 0,
        rank: currentRank++,
        currentStreakDays: (json['current_streak'] as num?)?.toInt() ?? 0,
        preferredMosqueName: json['mosque_name'] as String?,
      );
    }).toList();
  } catch (_) {
    return [];
  }
});

// Current User Streak Provider
final userStreakDaysProvider = Provider<int>((ref) {
  return 4; // Mock initial streak
});

// Current User Total Points Provider
final userTotalPointsProvider = Provider<int>((ref) {
  return 120; // Mock initial points
});
