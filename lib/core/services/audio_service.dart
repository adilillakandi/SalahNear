import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart';
import 'package:salah_near/core/utils/logger.dart';

final audioServiceProvider = Provider<AudioService>((ref) {
  final service = AudioService();
  ref.onDispose(() => service.dispose());
  return service;
});

class AudioService {
  AudioPlayer? _player;
  bool _isPlaying = false;
  String? _currentlyPlaying;

  bool get isPlaying => _isPlaying;
  String? get currentlyPlaying => _currentlyPlaying;

  AudioPlayer get player {
    _player ??= AudioPlayer();
    return _player!;
  }

  Future<void> playAdhan() async {
    await playAsset('assets/audio/adhan_tone.wav', tag: 'Adhan');
  }

  Future<void> playChime() async {
    await playAsset('assets/audio/chime_tone.wav', tag: 'Chime');
  }

  Future<void> playAsset(String assetPath, {String? tag}) async {
    try {
      await stop();
      await player.setAsset(assetPath);
      _currentlyPlaying = tag ?? assetPath;
      _isPlaying = true;
      AppLogger.info('Playing audio: $_currentlyPlaying');
      await player.play();
      _isPlaying = false;
      _currentlyPlaying = null;
    } catch (e) {
      _isPlaying = false;
      _currentlyPlaying = null;
      AppLogger.warning('Audio playback failed or skipped: $e');
    }
  }

  Future<void> stop() async {
    try {
      if (_player != null && _player!.playing) {
        await _player!.stop();
      }
    } catch (e) {
      AppLogger.warning('Error stopping audio: $e');
    } finally {
      _isPlaying = false;
      _currentlyPlaying = null;
    }
  }

  void dispose() {
    _player?.dispose();
    _player = null;
  }
}
