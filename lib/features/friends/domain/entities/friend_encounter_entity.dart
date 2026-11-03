import 'package:salah_near/core/constants/prayer_names.dart';

enum EncounterResponseState {
  pending,
  yes,
  no;

  static EncounterResponseState fromString(String? val) {
    switch (val?.toLowerCase()) {
      case 'yes':
      case 'connected':
        return EncounterResponseState.yes;
      case 'no':
      case 'not_connected':
        return EncounterResponseState.no;
      default:
        return EncounterResponseState.pending;
    }
  }
}

class FriendEncounterEntity {
  final String id;
  final String friendUserId;
  final String friendName;
  final String friendUsername;
  final String? friendAvatarUrl;
  final String mosqueId;
  final String mosqueName;
  final PrayerType prayerType;
  final DateTime prayerDate;
  final EncounterResponseState myResponse;
  final EncounterResponseState friendResponse;
  final bool isMutualConnected;
  final DateTime createdAt;

  const FriendEncounterEntity({
    required this.id,
    required this.friendUserId,
    required this.friendName,
    required this.friendUsername,
    this.friendAvatarUrl,
    required this.mosqueId,
    required this.mosqueName,
    required this.prayerType,
    required this.prayerDate,
    this.myResponse = EncounterResponseState.pending,
    this.friendResponse = EncounterResponseState.pending,
    this.isMutualConnected = false,
    required this.createdAt,
  });

  FriendEncounterEntity copyWith({
    String? id,
    String? friendUserId,
    String? friendName,
    String? friendUsername,
    String? friendAvatarUrl,
    String? mosqueId,
    String? mosqueName,
    PrayerType? prayerType,
    DateTime? prayerDate,
    EncounterResponseState? myResponse,
    EncounterResponseState? friendResponse,
    bool? isMutualConnected,
    DateTime? createdAt,
  }) {
    return FriendEncounterEntity(
      id: id ?? this.id,
      friendUserId: friendUserId ?? this.friendUserId,
      friendName: friendName ?? this.friendName,
      friendUsername: friendUsername ?? this.friendUsername,
      friendAvatarUrl: friendAvatarUrl ?? this.friendAvatarUrl,
      mosqueId: mosqueId ?? this.mosqueId,
      mosqueName: mosqueName ?? this.mosqueName,
      prayerType: prayerType ?? this.prayerType,
      prayerDate: prayerDate ?? this.prayerDate,
      myResponse: myResponse ?? this.myResponse,
      friendResponse: friendResponse ?? this.friendResponse,
      isMutualConnected: isMutualConnected ?? this.isMutualConnected,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
