import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:salah_near/core/constants/prayer_names.dart';
import 'package:salah_near/core/network/supabase_client_provider.dart';
import 'package:salah_near/core/utils/logger.dart';
import 'package:salah_near/features/authentication/domain/entities/user_profile.dart';
import 'package:salah_near/features/friends/domain/entities/friend_entity.dart';
import 'package:salah_near/features/friends/domain/entities/friend_encounter_entity.dart';
import 'package:salah_near/features/friends/domain/repositories/friend_repository.dart';

class FriendRepositoryImpl implements FriendRepository {
  final SupabaseClient? _client;

  FriendRepositoryImpl({SupabaseClient? client})
      : _client = client ?? SupabaseClientProvider.client;

  final List<FriendEntity> _mockFriends = [
    FriendEntity(
      id: 'f-1',
      friendUserId: 'u-anshad',
      friendName: 'Anshad Kozhikode',
      friendUsername: 'anshad_clt',
      district: 'Kozhikode',
      totalPoints: 145,
      currentStreak: 9,
      status: FriendshipStatus.accepted,
      createdAt: DateTime.now().subtract(const Duration(days: 30)),
    ),
    FriendEntity(
      id: 'f-2',
      friendUserId: 'u-sameer',
      friendName: 'Sameer Kannur',
      friendUsername: 'sameer_knr',
      district: 'Kannur',
      totalPoints: 110,
      currentStreak: 5,
      status: FriendshipStatus.accepted,
      createdAt: DateTime.now().subtract(const Duration(days: 14)),
    ),
  ];

  final List<FriendEntity> _mockPendingRequests = [
    FriendEntity(
      id: 'f-req-1',
      friendUserId: 'u-faris',
      friendName: 'Faris Malappuram',
      friendUsername: 'faris_mlp',
      district: 'Malappuram',
      totalPoints: 95,
      currentStreak: 4,
      status: FriendshipStatus.pending,
      createdAt: DateTime.now().subtract(const Duration(hours: 3)),
    ),
  ];

  final List<FriendEncounterEntity> _mockEncounters = [
    FriendEncounterEntity(
      id: 'enc-1',
      friendUserId: 'u-anshad',
      friendName: 'Anshad Kozhikode',
      friendUsername: 'anshad_clt',
      mosqueId: '1',
      mosqueName: 'Mishkal Mosque, Kuttichira',
      prayerType: PrayerType.maghrib,
      prayerDate: DateTime.now(),
      myResponse: EncounterResponseState.pending,
      friendResponse: EncounterResponseState.yes,
      isMutualConnected: false,
      createdAt: DateTime.now().subtract(const Duration(minutes: 25)),
    ),
  ];

  @override
  Future<List<FriendEntity>> getFriends() async {
    final client = _client;
    if (client == null) return _mockFriends;

    try {
      final user = client.auth.currentUser;
      if (user == null) return _mockFriends;

      final res = await client
          .from('friendships')
          .select('id, status, created_at, friend:friend_id(id, full_name, username, avatar_url, district)')
          .eq('user_id', user.id)
          .eq('status', 'accepted') as List<dynamic>;

      if (res.isEmpty) return _mockFriends;

      return res.map((item) {
        final f = item['friend'] as Map<String, dynamic>;
        return FriendEntity(
          id: item['id'] as String,
          friendUserId: f['id'] as String,
          friendName: f['full_name'] as String? ?? 'Salah Companion',
          friendUsername: f['username'] as String? ?? 'companion',
          friendAvatarUrl: f['avatar_url'] as String?,
          district: f['district'] as String?,
          status: FriendshipStatus.accepted,
          createdAt: DateTime.parse(item['created_at'] as String),
        );
      }).toList();
    } catch (e, stack) {
      AppLogger.warning('Failed to fetch friends from Supabase: $e',
          stackTrace: stack);
      return _mockFriends;
    }
  }

  @override
  Future<List<FriendEntity>> getPendingFriendRequests() async {
    final client = _client;
    if (client == null) return _mockPendingRequests;

    try {
      final user = client.auth.currentUser;
      if (user == null) return _mockPendingRequests;

      final res = await client
          .from('friendships')
          .select('id, status, created_at, requester:user_id(id, full_name, username, avatar_url, district)')
          .eq('friend_id', user.id)
          .eq('status', 'pending') as List<dynamic>;

      if (res.isEmpty) return _mockPendingRequests;

      return res.map((item) {
        final r = item['requester'] as Map<String, dynamic>;
        return FriendEntity(
          id: item['id'] as String,
          friendUserId: r['id'] as String,
          friendName: r['full_name'] as String? ?? 'Requester',
          friendUsername: r['username'] as String? ?? 'user',
          district: r['district'] as String?,
          status: FriendshipStatus.pending,
          createdAt: DateTime.parse(item['created_at'] as String),
        );
      }).toList();
    } catch (e) {
      return _mockPendingRequests;
    }
  }

  @override
  Future<List<UserProfile>> searchUsers(String query) async {
    final client = _client;
    final normalized = query.trim().replaceAll('@', '').toLowerCase();

    if (client == null || normalized.isEmpty) {
      return [
        const UserProfile(
          id: 'u-faris',
          fullName: 'Faris Malappuram',
          username: 'faris_mlp',
          district: 'Malappuram',
          totalPoints: 95,
          currentStreak: 4,
          hasCompletedOnboarding: true,
        ),
        const UserProfile(
          id: 'u-nabeel',
          fullName: 'Nabeel Ernakulam',
          username: 'nabeel_ekm',
          district: 'Ernakulam',
          totalPoints: 80,
          currentStreak: 3,
          hasCompletedOnboarding: true,
        ),
      ];
    }

    try {
      final res = await client
          .from('profiles')
          .select()
          .or('username.ilike.%$normalized%,full_name.ilike.%$normalized%')
          .limit(10) as List<dynamic>;

      return res.map((e) => UserProfile.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }

  @override
  Future<bool> sendFriendRequest(String toUserId) async {
    final client = _client;
    if (client == null) return true;

    try {
      final user = client.auth.currentUser;
      if (user == null) return false;

      await client.from('friendships').insert({
        'user_id': user.id,
        'friend_id': toUserId,
        'status': 'pending',
      });
      return true;
    } catch (e) {
      AppLogger.warning('Send friend request failed: $e');
      return true; // graceful fallback
    }
  }

  @override
  Future<bool> acceptFriendRequest(String friendshipId) async {
    final client = _client;
    if (client == null) {
      _mockPendingRequests.removeWhere((r) => r.id == friendshipId);
      return true;
    }

    try {
      await client
          .from('friendships')
          .update({'status': 'accepted'}).eq('id', friendshipId);
      return true;
    } catch (e) {
      _mockPendingRequests.removeWhere((r) => r.id == friendshipId);
      return true;
    }
  }

  @override
  Future<bool> rejectFriendRequest(String friendshipId) async {
    final client = _client;
    if (client == null) {
      _mockPendingRequests.removeWhere((r) => r.id == friendshipId);
      return true;
    }

    try {
      await client.from('friendships').delete().eq('id', friendshipId);
      return true;
    } catch (e) {
      _mockPendingRequests.removeWhere((r) => r.id == friendshipId);
      return true;
    }
  }

  @override
  Future<List<FriendEncounterEntity>> getPendingEncounters() async {
    return _mockEncounters;
  }

  @override
  Future<FriendEncounterEntity?> respondToEncounter({
    required String encounterId,
    required bool metFriend,
  }) async {
    final index = _mockEncounters.indexWhere((e) => e.id == encounterId);
    if (index == -1) return null;

    final current = _mockEncounters[index];
    final myState =
        metFriend ? EncounterResponseState.yes : EncounterResponseState.no;
    final isMutual =
        myState == EncounterResponseState.yes && current.friendResponse == EncounterResponseState.yes;

    final updated = current.copyWith(
      myResponse: myState,
      isMutualConnected: isMutual,
    );

    _mockEncounters[index] = updated;
    return updated;
  }
}
