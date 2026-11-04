import 'package:salah_near/features/authentication/domain/entities/user_profile.dart';

abstract class AuthRepository {
  Future<void> sendPhoneOtp(String phoneNumber);
  Future<UserProfile> verifyPhoneOtp(String phoneNumber, String token);
  Future<UserProfile> signInWithEmail(String email, String password);
  Future<UserProfile> signUpWithEmail(String email, String password, {String? fullName});
  Future<void> signOut();
  Future<UserProfile?> getCurrentUserProfile();
  Future<UserProfile> updateUserProfile(UserProfile profile);
  Stream<UserProfile?> authStateChanges();
}

