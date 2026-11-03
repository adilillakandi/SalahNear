import 'package:flutter/material.dart';
import 'package:salah_near/shared/widgets/empty_state_view.dart';

class FriendsScreen extends StatelessWidget {
  const FriendsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mosque Companions'),
      ),
      body: const EmptyStateView(
        icon: Icons.people_outline,
        title: 'Shared Mosque Encounters',
        subtitle:
            'Connect with friends to discover when you both attend prayer at the same Kerala mosque.',
        buttonText: 'Invite Friends',
      ),
    );
  }
}
