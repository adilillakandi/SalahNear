import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/core/network/supabase_client_provider.dart';
import 'package:salah_near/features/authentication/domain/entities/user_profile.dart';
import 'package:salah_near/features/friends/data/repositories/friend_repository_impl.dart';
import 'package:salah_near/features/friends/domain/entities/friend_entity.dart';
import 'package:salah_near/features/friends/domain/entities/friend_encounter_entity.dart';
import 'package:salah_near/features/friends/domain/repositories/friend_repository.dart';

final friendsRepositoryProvider = Provider<FriendRepository>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  return FriendRepositoryImpl(client: supabase);
});

final friendsListProvider = FutureProvider<List<FriendEntity>>((ref) async {
  final repo = ref.watch(friendsRepositoryProvider);
  return repo.getFriends();
});

final pendingFriendRequestsProvider =
    FutureProvider<List<FriendEntity>>((ref) async {
  final repo = ref.watch(friendsRepositoryProvider);
  return repo.getPendingFriendRequests();
});

final pendingEncountersProvider =
    FutureProvider<List<FriendEncounterEntity>>((ref) async {
  final repo = ref.watch(friendsRepositoryProvider);
  return repo.getPendingEncounters();
});

final searchUsersProvider =
    FutureProvider.family<List<UserProfile>, String>((ref, query) async {
  if (query.trim().isEmpty) return [];
  final repo = ref.watch(friendsRepositoryProvider);
  return repo.searchUsers(query);
});

class FriendsNotifier extends StateNotifier<AsyncValue<void>> {
  final FriendRepository _repository;
  final Ref _ref;

  FriendsNotifier(this._repository, this._ref)
      : super(const AsyncValue.data(null));

  Future<bool> sendRequest(String toUserId) async {
    state = const AsyncValue.loading();
    try {
      final success = await _repository.sendFriendRequest(toUserId);
      _ref.invalidate(friendsListProvider);
      state = const AsyncValue.data(null);
      return success;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      return false;
    }
  }

  Future<void> acceptRequest(String friendshipId) async {
    state = const AsyncValue.loading();
    try {
      await _repository.acceptFriendRequest(friendshipId);
      _ref.invalidate(pendingFriendRequestsProvider);
      _ref.invalidate(friendsListProvider);
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> rejectRequest(String friendshipId) async {
    state = const AsyncValue.loading();
    try {
      await _repository.rejectFriendRequest(friendshipId);
      _ref.invalidate(pendingFriendRequestsProvider);
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<FriendEncounterEntity?> respondToEncounter({
    required String encounterId,
    required bool metFriend,
  }) async {
    try {
      final res = await _repository.respondToEncounter(
        encounterId: encounterId,
        metFriend: metFriend,
      );
      _ref.invalidate(pendingEncountersProvider);
      return res;
    } catch (e) {
      return null;
    }
  }
}

final friendsNotifierProvider =
    StateNotifierProvider<FriendsNotifier, AsyncValue<void>>((ref) {
  final repo = ref.watch(friendsRepositoryProvider);
  return FriendsNotifier(repo, ref);
});

