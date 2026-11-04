import 'package:flutter_test/flutter_test.dart';
import 'package:salah_near/features/friends/data/repositories/friend_repository_impl.dart';
import 'package:salah_near/features/friends/domain/entities/friend_encounter_entity.dart';

void main() {
  group('Friend & Encounter Tests', () {
    test('Loads pending encounters and confirms mutual connection when both respond Yes', () async {
      final repo = FriendRepositoryImpl(client: null);
      final encounters = await repo.getPendingEncounters();

      expect(encounters.isNotEmpty, isTrue);
      final first = encounters.first;
      expect(first.friendResponse, EncounterResponseState.yes);
      expect(first.isMutualConnected, isFalse);

      final updated = await repo.respondToEncounter(
        encounterId: first.id,
        metFriend: true,
      );

      expect(updated, isNotNull);
      expect(updated!.myResponse, EncounterResponseState.yes);
      expect(updated.isMutualConnected, isTrue); // Both answered yes -> mutual connected
    });
  });
}

