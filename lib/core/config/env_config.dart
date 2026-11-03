class EnvConfig {
  EnvConfig._();

  // Supabase Configuration
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://vopcihpgfqborlwwimyx.supabase.co',
  );

  static const String supabasePublishableKey = String.fromEnvironment(
    'SUPABASE_PUBLISHABLE_KEY',
    defaultValue: 'sb_publishable_l8KORwmCkgfASPLejedHZA_UNjQBC4P',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvcGNpaHBnZnFib3Jsd3dpbXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODE4OTIsImV4cCI6MjEwOTE1Nzg5Mn0.Uo4EEiJJbY2vyByF-c_AIrB7U-pd5SkwHrdT8RXn9J4',
  );

  static const bool isProduction = bool.fromEnvironment(
    'IS_PRODUCTION',
    defaultValue: false,
  );
}
