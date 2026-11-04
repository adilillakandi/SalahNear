import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/features/authentication/data/repositories/auth_repository_impl.dart';
import 'package:salah_near/features/authentication/domain/entities/user_profile.dart';
import 'package:salah_near/features/authentication/domain/repositories/auth_repository.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl();
});

final authStateProvider = StreamProvider<UserProfile?>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  return repo.authStateChanges();
});

class AuthState {
  final bool isLoading;
  final String? errorMessage;
  final UserProfile? userProfile;
  final String? pendingPhoneNumber;

  const AuthState({
    this.isLoading = false,
    this.errorMessage,
    this.userProfile,
    this.pendingPhoneNumber,
  });

  AuthState copyWith({
    bool? isLoading,
    String? errorMessage,
    UserProfile? userProfile,
    String? pendingPhoneNumber,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      userProfile: userProfile ?? this.userProfile,
      pendingPhoneNumber: pendingPhoneNumber ?? this.pendingPhoneNumber,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(const AuthState()) {
    _loadInitialUser();
  }

  Future<void> _loadInitialUser() async {
    state = state.copyWith(isLoading: true);
    final user = await _repository.getCurrentUserProfile();
    state = state.copyWith(isLoading: false, userProfile: user);
  }

  Future<bool> sendPhoneOtp(String phoneNumber) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final formatted = phoneNumber.startsWith('+') ? phoneNumber : '+91$phoneNumber';
      await _repository.sendPhoneOtp(formatted);
      state = state.copyWith(
        isLoading: false,
        pendingPhoneNumber: formatted,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  Future<bool> verifyOtp(String otp) async {
    final phone = state.pendingPhoneNumber;
    if (phone == null) {
      state = state.copyWith(errorMessage: 'No pending phone number found.');
      return false;
    }

    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final profile = await _repository.verifyPhoneOtp(phone, otp);
      state = state.copyWith(
        isLoading: false,
        userProfile: profile,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Invalid OTP code. Please try again.',
      );
      return false;
    }
  }

  Future<bool> signInWithEmail(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final profile = await _repository.signInWithEmail(email, password);
      state = state.copyWith(isLoading: false, userProfile: profile);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> signUpWithEmail(String email, String password, {String? fullName}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final profile = await _repository.signUpWithEmail(email, password, fullName: fullName);
      state = state.copyWith(isLoading: false, userProfile: profile);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<void> updateProfile(UserProfile updated) async {
    state = state.copyWith(isLoading: true);
    try {
      final result = await _repository.updateUserProfile(updated);
      state = state.copyWith(isLoading: false, userProfile: result);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> signOut() async {
    await _repository.signOut();
    state = const AuthState();
  }
}

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  return AuthNotifier(repo);
});

