import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:salah_near/main.dart';

void main() {
  testWidgets('SalahNearApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: SalahNearApp(),
      ),
    );

    // Verify app starts and renders
    expect(find.byType(SalahNearApp), findsOneWidget);
  });
}
