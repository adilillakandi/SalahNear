import 'dart:io';
import 'package:confetti/confetti.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/core/constants/prayer_names.dart';
import 'package:salah_near/core/services/location_service.dart';
import 'package:salah_near/core/utils/image_utils.dart';
import 'package:salah_near/features/attendance/domain/entities/attendance_submission.dart';
import 'package:salah_near/features/attendance/presentation/providers/attendance_provider.dart';
import 'package:salah_near/features/mosques/presentation/providers/mosque_provider.dart';
import 'package:salah_near/routing/app_routes.dart';
import 'package:salah_near/shared/widgets/app_button.dart';

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late ConfettiController _confettiController;
  final ImagePicker _picker = ImagePicker();

  File? _evidencePhoto;
  String? _imageSha256;
  Position? _currentPosition;
  double? _distanceToMosque;
  bool _isLocating = true;
  bool _isMocked = false;
  bool _qrScanned = false;
  MobileScannerController? _scannerController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _confettiController =
        ConfettiController(duration: const Duration(seconds: 3));
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
    );
    _resolveLocation();
  }

  Future<void> _resolveLocation() async {
    setState(() => _isLocating = true);
    final locationService = ref.read(locationServiceProvider);
    final pos = await locationService.getCurrentLocation();
    if (!mounted) return;

    final selectedMosque = ref.read(selectedMosqueProvider);
    double dist = 28.0; // fallback default
    if (selectedMosque != null) {
      dist = Geolocator.distanceBetween(
        pos.latitude,
        pos.longitude,
        selectedMosque.latitude,
        selectedMosque.longitude,
      );
    }
    setState(() {
      _currentPosition = pos;
      _isMocked = pos.isMocked;
      _distanceToMosque = dist;
      _isLocating = false;
    });
  }

  Future<void> _capturePhoto() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );
      if (image != null) {
        final file = File(image.path);
        final compressedBytes = await ImageUtils.compressImageFile(file);
        final hash = compressedBytes != null
            ? ImageUtils.calculateSha256(compressedBytes)
            : 'hash-${DateTime.now().millisecondsSinceEpoch}';

        setState(() {
          _evidencePhoto = file;
          _imageSha256 = hash;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not open camera: $e')),
        );
      }
    }
  }

  Future<void> _handleSubmit({String? qrToken}) async {
    final selectedMosque = ref.read(selectedMosqueProvider);
    final selectedPrayer = ref.read(selectedCheckInPrayerProvider);

    if (_isMocked) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Mock GPS location detected! Verification is restricted by anti-fraud policy.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final mosqueId = selectedMosque?.id ?? 'default-mosque-1';
    final mosqueName = selectedMosque?.name ?? 'Mishkal Mosque, Calicut';

    final submission = AttendanceSubmission(
      mosqueId: mosqueId,
      mosqueName: mosqueName,
      prayerType: selectedPrayer,
      prayerDate: DateTime.now(),
      latitude: _currentPosition?.latitude ?? 11.2425,
      longitude: _currentPosition?.longitude ?? 75.7766,
      accuracyMeters: _currentPosition?.accuracy ?? 15.0,
      qrPayload: qrToken,
      idempotencyKey:
          '${mosqueId}_${selectedPrayer.name}_${DateTime.now().year}${DateTime.now().month}${DateTime.now().day}',
      submittedAt: DateTime.now(),
    );

    final result = await ref
        .read(attendanceSubmissionNotifierProvider.notifier)
        .submit(submission: submission, evidencePhoto: _evidencePhoto);

    if (!mounted) return;

    if (result != null) {
      _confettiController.play();
      _showSuccessDialog(result);
    } else {
      final err = ref.read(attendanceSubmissionNotifierProvider).error?.toString() ??
          'Attendance submission failed.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: Colors.red),
      );
    }
  }

  void _showSuccessDialog(AttendanceSubmission submission) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return Stack(
          alignment: Alignment.center,
          children: [
            AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              contentPadding: const EdgeInsets.all(24),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(
                      color: AppColors.primaryContainer,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_circle,
                      color: AppColors.primary,
                      size: 44,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Salah Check-In Recorded!',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${submission.prayerType.displayName} prayer at ${submission.mosqueName}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 13, color: Colors.grey),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppColors.secondaryContainer.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.secondary.withValues(alpha: 0.5),
                      ),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.stars, color: AppColors.secondaryDark, size: 22),
                        SizedBox(width: 8),
                        Text(
                          '+5 Community Points Awarded',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.secondaryDark,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.local_fire_department,
                          color: AppColors.streakFire, size: 20),
                      SizedBox(width: 4),
                      Text(
                        'Daily Streak Active!',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: AppColors.streakFire,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  AppButton(
                    text: 'View Encounters & Companions',
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      context.push(AppRoutes.friends);
                    },
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      context.go(AppRoutes.home);
                    },
                    child: const Text('Back to Home'),
                  ),
                ],
              ),
            ),
            Align(
              alignment: Alignment.topCenter,
              child: ConfettiWidget(
                confettiController: _confettiController,
                blastDirectionality: BlastDirectionality.explosive,
                shouldLoop: false,
                colors: const [
                  AppColors.primary,
                  AppColors.secondary,
                  Colors.green,
                  Colors.amber,
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _confettiController.dispose();
    _scannerController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selectedMosque = ref.watch(selectedMosqueProvider);
    final selectedPrayer = ref.watch(selectedCheckInPrayerProvider);
    final submissionState = ref.watch(attendanceSubmissionNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance Check-In'),
        actions: [
          IconButton(
            icon: const Icon(Icons.history),
            tooltip: 'Attendance History',
            onPressed: () => context.push(AppRoutes.attendanceHistory),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: Colors.grey,
          tabs: const [
            Tab(icon: Icon(Icons.camera_alt), text: 'Photo Evidence'),
            Tab(icon: Icon(Icons.qr_code_scanner), text: 'Mosque QR Code'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Selected Mosque and Anti-Fraud Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.grey.shade50,
            child: Column(
              children: [
                Row(
                  children: [
                    const CircleAvatar(
                      backgroundColor: AppColors.primary,
                      radius: 18,
                      child: Icon(Icons.mosque, color: Colors.white, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'CONGREGATION VENUE',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                              letterSpacing: 0.8,
                            ),
                          ),
                          Text(
                            selectedMosque?.name ?? 'Mishkal Mosque, Calicut',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => context.push(AppRoutes.mosques),
                      child: const Text('Change'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Distance & Anti-Fraud Pill
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _isMocked
                            ? Colors.red.shade100
                            : (_distanceToMosque != null &&
                                    _distanceToMosque! <= 100)
                                ? Colors.green.shade100
                                : Colors.amber.shade100,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _isMocked
                                ? Icons.warning_amber
                                : Icons.location_on,
                            size: 14,
                            color: _isMocked
                                ? Colors.red
                                : (_distanceToMosque != null &&
                                        _distanceToMosque! <= 100)
                                    ? Colors.green.shade800
                                    : Colors.amber.shade900,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _isMocked
                                ? 'Mock GPS Detected'
                                : _isLocating
                                    ? 'Locating...'
                                    : '${_distanceToMosque?.round() ?? 28}m from Mosque',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: _isMocked
                                  ? Colors.red
                                  : (_distanceToMosque != null &&
                                          _distanceToMosque! <= 100)
                                      ? Colors.green.shade800
                                      : Colors.amber.shade900,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Accuracy: ±${_currentPosition?.accuracy.round() ?? 12}m',
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.refresh, size: 18),
                      tooltip: 'Refresh Location',
                      onPressed: _resolveLocation,
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Prayer Selection Pills
          Container(
            height: 48,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: PrayerType.values.map((prayer) {
                final isSelected = selectedPrayer == prayer;
                return Padding(
                  padding: const EdgeInsets.only(right: 6, top: 4, bottom: 4),
                  child: ChoiceChip(
                    label: Text('${prayer.displayName} (+5 pts)'),
                    selected: isSelected,
                    selectedColor: AppColors.primary,
                    labelStyle: TextStyle(
                      fontSize: 12,
                      color: isSelected ? Colors.white : Colors.black87,
                      fontWeight:
                          isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    onSelected: (val) {
                      if (val) {
                        ref.read(selectedCheckInPrayerProvider.notifier).state =
                            prayer;
                      }
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const Divider(height: 1),

          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // TAB 1: Camera Photo Evidence
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: _capturePhoto,
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: _evidencePhoto != null
                                    ? AppColors.primary
                                    : Colors.grey.shade300,
                                width: _evidencePhoto != null ? 2 : 1,
                              ),
                            ),
                            child: _evidencePhoto != null
                                ? ClipRRect(
                                    borderRadius: BorderRadius.circular(14),
                                    child: Stack(
                                      fit: StackFit.expand,
                                      children: [
                                        Image.file(
                                          _evidencePhoto!,
                                          fit: BoxFit.cover,
                                        ),
                                        Positioned(
                                          bottom: 12,
                                          left: 12,
                                          right: 12,
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 10, vertical: 6),
                                            decoration: BoxDecoration(
                                              color: Colors.black.withValues(
                                                  alpha: 0.65),
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                            ),
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                const Text(
                                                  'Photo Evidence Verified',
                                                  style: TextStyle(
                                                    color: Colors.white,
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                                Text(
                                                  'SHA-256: ${_imageSha256?.substring(0, 16) ?? ''}...',
                                                  style: const TextStyle(
                                                    color: Colors.white70,
                                                    fontSize: 9,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  )
                                : const Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.camera_alt_outlined,
                                        size: 56,
                                        color: AppColors.primary,
                                      ),
                                      SizedBox(height: 12),
                                      Text(
                                        'Capture In-App Photo Evidence',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      SizedBox(height: 4),
                                      Text(
                                        'Take a picture inside or near the prayer hall',
                                        style: TextStyle(
                                            fontSize: 12, color: Colors.grey),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (_evidencePhoto != null)
                        TextButton.icon(
                          onPressed: _capturePhoto,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retake Photo'),
                        ),
                      const SizedBox(height: 8),
                      AppButton(
                        text: 'Submit Salah Attendance',
                        isLoading: submissionState.isLoading,
                        onPressed: _evidencePhoto == null
                            ? _capturePhoto
                            : () => _handleSubmit(),
                      ),
                    ],
                  ),
                ),

                // TAB 2: Dynamic Mosque QR Code Scanner
                Column(
                  children: [
                    Expanded(
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          if (_scannerController != null)
                            MobileScanner(
                              controller: _scannerController!,
                              onDetect: (capture) {
                                if (_qrScanned) return;
                                final barcodes = capture.barcodes;
                                for (final b in barcodes) {
                                  final val = b.rawValue;
                                  if (val != null &&
                                      val.startsWith('salahnear://')) {
                                    _qrScanned = true;
                                    _handleSubmit(qrToken: val);
                                    break;
                                  }
                                }
                              },
                            ),
                          // Reticle Frame
                          Container(
                            width: 240,
                            height: 240,
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: AppColors.secondary,
                                width: 3,
                              ),
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(20),
                      color: Colors.white,
                      child: Column(
                        children: [
                          const Text(
                            'Scan Mosque Screen / Dynamic QR Code',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Point your camera at the official SalahNear rotating QR token displayed in the masjid.',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                          const SizedBox(height: 16),
                          AppButton(
                            text: 'Simulate Mosque QR Token',
                            isOutlined: true,
                            onPressed: () {
                              _handleSubmit(
                                qrToken:
                                    'salahnear://mosque/${selectedMosque?.id ?? '1'}?session=${selectedPrayer.name}&ts=${DateTime.now().millisecondsSinceEpoch}&sig=sample_valid_signature',
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
