import 'package:flutter_test/flutter_test.dart';
import 'package:salah_near/features/authentication/data/repositories/auth_repository_impl.dart';

void main() {
  group('AuthRepository Tests', () {
    test('Verifies OTP demo code 123456 and creates user profile', () async {
      final repo = AuthRepositoryImpl(client: null);
      final profile = await repo.verifyPhoneOtp('+919876543210', '123456');

      expect(profile.id, contains('9876543210'));
      expect(profile.hasCompletedOnboarding, isTrue);
      expect(profile.district, 'Kozhikode');
    });

    test('Loads initial profile with default Kerala fallback', () async {
      final repo = AuthRepositoryImpl(client: null);
      final profile = await repo.getCurrentUserProfile();

      expect(profile, isNotNull);
      expect(profile?.district, 'Kozhikode');
      expect(profile?.currentStreak, greaterThanOrEqualTo(0));
    });
  });
}

