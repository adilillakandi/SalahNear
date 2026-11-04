import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vopcihpgfqborlwwimyx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvcGNpaHBnZnFib3Jsd3dpbXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODE4OTIsImV4cCI6MjEwOTE1Nzg5Mn0.Uo4EEiJJbY2vyByF-c_AIrB7U-pd5SkwHrdT8RXn9J4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

