(() => {
  const SUPABASE_URL = 'https://cpnhmkrqrnargjuswugz.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwbmhta3Jxcm5hcmdqdXN3dWd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzkyNjEsImV4cCI6MjA3NjYxNTI2MX0.loLTDU5rG8aPRfSxqFX20GMteqseyLHsSYfvKEMwt9g';

  if (!window.supabase) {
    console.error('Supabase SDK not loaded. Check the CDN script tag.');
    return;
  }
  window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();

