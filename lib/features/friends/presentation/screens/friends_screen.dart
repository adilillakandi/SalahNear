import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:salah_near/core/constants/app_colors.dart';
import 'package:salah_near/features/friends/domain/entities/friend_entity.dart';
import 'package:salah_near/features/friends/presentation/providers/friends_provider.dart';
import 'package:salah_near/features/friends/presentation/widgets/encounter_card.dart';
import 'package:salah_near/shared/widgets/empty_state_view.dart';

class FriendsScreen extends ConsumerStatefulWidget {
  const FriendsScreen({super.key});

  @override
  ConsumerState<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends ConsumerState<FriendsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pendingRequestsAsync = ref.watch(pendingFriendRequestsProvider);
    final requestsCount = pendingRequestsAsync.value?.length ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mosque Companions'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: Colors.grey,
          tabs: [
            const Tab(text: 'Companions'),
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Requests'),
                  if (requestsCount > 0) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '$requestsCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Tab(text: 'Find Friends'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildCompanionsTab(),
          _buildRequestsTab(),
          _buildFindFriendsTab(),
        ],
      ),
    );
  }

  Widget _buildCompanionsTab() {
    final encountersAsync = ref.watch(pendingEncountersProvider);
    final friendsAsync = ref.watch(friendsListProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(pendingEncountersProvider);
        ref.invalidate(friendsListProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Section: Shared Mosque Encounters
          encountersAsync.when(
            data: (encounters) {
              if (encounters.isEmpty) return const SizedBox.shrink();
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Recent Congregation Encounters',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...encounters.map((e) => EncounterCard(encounter: e)),
                  const SizedBox(height: 16),
                ],
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (err, stack) => const SizedBox.shrink(),
          ),

          // Section: Active Companions
          const Text(
            'Your Connected Companions',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),

          friendsAsync.when(
            data: (friends) {
              if (friends.isEmpty) {
                return const EmptyStateView(
                  icon: Icons.people_outline,
                  title: 'No companions yet',
                  subtitle:
                      'Find your friends using the Find Friends tab to discover shared mosque encounters!',
                );
              }

              return ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: friends.length,
                separatorBuilder: (ctx, i) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final friend = friends[index];
                  return _buildFriendCard(friend);
                },
              );
            },
            loading: () => const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(),
              ),
            ),
            error: (err, stack) => Center(
              child: Text('Error loading companions: $err'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFriendCard(FriendEntity friend) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: AppColors.primaryContainer,
            child: Text(
              friend.friendName.substring(0, 1).toUpperCase(),
              style: const TextStyle(
                color: AppColors.primaryDark,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  friend.friendName,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                Text(
                  '@${friend.friendUsername} • ${friend.district ?? "Kerala"}',
                  style: const TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.local_fire_department,
                      color: AppColors.streakFire, size: 16),
                  const SizedBox(width: 2),
                  Text(
                    '${friend.currentStreak}d',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppColors.streakFire,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                '${friend.totalPoints} pts',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.secondaryDark,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRequestsTab() {
    final requestsAsync = ref.watch(pendingFriendRequestsProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(pendingFriendRequestsProvider),
      child: requestsAsync.when(
        data: (requests) {
          if (requests.isEmpty) {
            return const EmptyStateView(
              icon: Icons.mark_email_read_outlined,
              title: 'No Pending Requests',
              subtitle: 'When other brothers add you, they will appear here.',
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: requests.length,
            separatorBuilder: (ctx, i) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final req = requests[index];
              return Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: AppColors.primaryContainer,
                      child: Text(
                        req.friendName.substring(0, 1).toUpperCase(),
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            req.friendName,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          Text(
                            '@${req.friendUsername}',
                            style: const TextStyle(
                                fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.check_circle,
                          color: AppColors.primary),
                      onPressed: () {
                        ref
                            .read(friendsNotifierProvider.notifier)
                            .acceptRequest(req.id);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                              content: Text('Added ${req.friendName} as companion')),
                        );
                      },
                    ),
                    IconButton(
                      icon: const Icon(Icons.cancel_outlined,
                          color: Colors.grey),
                      onPressed: () {
                        ref
                            .read(friendsNotifierProvider.notifier)
                            .rejectRequest(req.id);
                      },
                    ),
                  ],
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildFindFriendsTab() {
    final searchAsync = ref.watch(searchUsersProvider(_searchQuery));

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search by username (@anshad) or name...',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onChanged: (val) {
              setState(() => _searchQuery = val);
            },
          ),
        ),
        Expanded(
          child: searchAsync.when(
            data: (users) {
              if (users.isEmpty) {
                return const EmptyStateView(
                  icon: Icons.person_search,
                  title: 'Search for Companions',
                  subtitle:
                      'Type a name or username to connect and track shared prayers.',
                );
              }

              return ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: users.length,
                separatorBuilder: (ctx, i) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final user = users[index];
                  return Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: AppColors.primaryContainer,
                          child: Text(
                            user.fullName.substring(0, 1).toUpperCase(),
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user.fullName,
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                              Text(
                                '@${user.username ?? "user"} • ${user.district ?? "Kerala"}',
                                style: const TextStyle(
                                    fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        ElevatedButton.icon(
                          icon: const Icon(Icons.person_add, size: 16),
                          label: const Text('Connect'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          onPressed: () async {
                            final success = await ref
                                .read(friendsNotifierProvider.notifier)
                                .sendRequest(user.id);
                            if (context.mounted && success) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                      'Friend request sent to ${user.fullName}!'),
                                ),
                              );
                            }
                          },
                        ),
                      ],
                    ),
                  );
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, stack) => Center(child: Text('Error searching: $err')),
          ),
        ),
      ],
    );
  }
}
