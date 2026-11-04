import 'package:salah_near/features/authentication/domain/entities/user_profile.dart';
import 'package:salah_near/features/friends/domain/entities/friend_entity.dart';
import 'package:salah_near/features/friends/domain/entities/friend_encounter_entity.dart';

abstract class FriendRepository {
  Future<List<FriendEntity>> getFriends();
  Future<List<FriendEntity>> getPendingFriendRequests();
  Future<List<UserProfile>> searchUsers(String query);
  Future<bool> sendFriendRequest(String toUserId);
  Future<bool> acceptFriendRequest(String friendshipId);
  Future<bool> rejectFriendRequest(String friendshipId);
  Future<List<FriendEncounterEntity>> getPendingEncounters();
  Future<FriendEncounterEntity?> respondToEncounter({
    required String encounterId,
    required bool metFriend,
  });
}

