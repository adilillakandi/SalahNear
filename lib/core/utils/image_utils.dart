import 'dart:io';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:salah_near/core/utils/logger.dart';

class ImageUtils {
  ImageUtils._();

  /// Compresses the image file to reduce network payload and optimize upload.
  static Future<Uint8List?> compressImageFile(File file, {int quality = 80, int minWidth = 1024, int minHeight = 1024}) async {
    try {
      final result = await FlutterImageCompress.compressWithFile(
        file.absolute.path,
        minWidth: minWidth,
        minHeight: minHeight,
        quality: quality,
        format: CompressFormat.jpeg,
      );
      return result;
    } catch (e) {
      AppLogger.warning('Image compression failed; falling back to original bytes: $e');
      return await file.readAsBytes();
    }
  }

  /// Calculates SHA-256 digest of image bytes for anti-fraud photo deduplication.
  static String calculateSha256(Uint8List bytes) {
    final digest = sha256.convert(bytes);
    return digest.toString();
  }
}
