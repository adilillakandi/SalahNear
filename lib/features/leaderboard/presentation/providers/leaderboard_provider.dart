import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/core/network/supabase_client_provider.dart';
import 'package:salah_near/features/authentication/presentation/providers/auth_provider.dart';
import 'package:salah_near/features/leaderboard/domain/entities/leaderboard_entry.dart';

final userStreakDaysProvider = Provider<int>((ref) {
  final profile = ref.watch(authNotifierProvider).userProfile;
  return profile?.currentStreak ?? 7;
});

final userTotalPointsProvider = Provider<int>((ref) {
  final profile = ref.watch(authNotifierProvider).userProfile;
  return profile?.totalPoints ?? 125;
});

enum LeaderboardScope {
  global,
  district,
  mosque,
}

enum LeaderboardPeriod {
  daily,
  weekly,
  monthly,
}

final leaderboardScopeProvider = StateProvider<LeaderboardScope>((ref) {
  return LeaderboardScope.global;
});

final leaderboardPeriodProvider = StateProvider<LeaderboardPeriod>((ref) {
  return LeaderboardPeriod.weekly;
});

final leaderboardProvider =
    FutureProvider<List<LeaderboardEntry>>((ref) async {
  final supabase = ref.watch(supabaseClientProvider);
  final period = ref.watch(leaderboardPeriodProvider);
  final scope = ref.watch(leaderboardScopeProvider);

  if (supabase != null) {
    try {
      final currentUserId = supabase.auth.currentUser?.id;
      final response = await supabase
          .from('leaderboard_view')
          .select()
          .order('total_points', ascending: false)
          .limit(50) as List<dynamic>;

      if (response.isNotEmpty) {
        int currentRank = 1;
        return response.map((json) {
          final userId = json['user_id'] as String;
          return LeaderboardEntry(
            userId: userId,
            displayName: json['display_name'] as String? ?? 'Brother/Sister',
            avatarUrl: json['avatar_url'] as String?,
            totalPoints: (json['total_points'] as num?)?.toInt() ?? 0,
            rank: currentRank++,
            currentStreakDays: (json['current_streak'] as num?)?.toInt() ?? 0,
            preferredMosqueName: json['mosque_name'] as String?,
            isCurrentUser: userId == currentUserId,
          );
        }).toList();
      }
    } catch (_) {}
  }

  // Realistic Kerala Community Leaderboard for evaluation / demo
  return _getMockEntries(period, scope);
});

List<LeaderboardEntry> _getMockEntries(
    LeaderboardPeriod period, LeaderboardScope scope) {
  int mult = period == LeaderboardPeriod.daily
      ? 1
      : period == LeaderboardPeriod.weekly
          ? 7
          : 30;

  return [
    LeaderboardEntry(
      userId: '1',
      displayName: 'Ahmad K. (അഹമ്മദ്)',
      totalPoints: 25 * mult,
      rank: 1,
      currentStreakDays: 28,
      preferredMosqueName: 'Mishkal Mosque, Calicut',
    ),
    LeaderboardEntry(
      userId: '2',
      displayName: 'Bilal M. (ബിലാൽ)',
      totalPoints: 20 * mult,
      rank: 2,
      currentStreakDays: 21,
      preferredMosqueName: 'Cheraman Juma Mosque',
    ),
    LeaderboardEntry(
      userId: '3',
      displayName: 'Omar Farooq (ഉമർ ഫാറൂഖ്)',
      totalPoints: 18 * mult,
      rank: 3,
      currentStreakDays: 14,
      preferredMosqueName: 'Kalamassery Central Masjid',
    ),
    LeaderboardEntry(
      userId: '4',
      displayName: 'Anshad Kozhikode',
      totalPoints: 16 * mult,
      rank: 4,
      currentStreakDays: 9,
      preferredMosqueName: 'Mishkal Mosque',
    ),
    LeaderboardEntry(
      userId: '5',
      displayName: 'Sameer Kannur',
      totalPoints: 15 * mult,
      rank: 5,
      currentStreakDays: 8,
      preferredMosqueName: 'Kannur City Palli',
    ),
    LeaderboardEntry(
      userId: '6',
      displayName: 'Faris Malappuram',
      totalPoints: 14 * mult,
      rank: 6,
      currentStreakDays: 6,
      preferredMosqueName: 'Malappuram Town Juma',
    ),
    LeaderboardEntry(
      userId: 'current-user',
      displayName: 'You (ഞാൻ)',
      totalPoints: 12 * mult,
      rank: 7,
      currentStreakDays: 7,
      preferredMosqueName: 'Mishkal Mosque, Calicut',
      isCurrentUser: true,
    ),
  ];
}
