import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktkijypjnamcblypdnsg.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0a2lqeXBqbmFtY2JseXBkbnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDE3NDEsImV4cCI6MjA4MTA3Nzc0MX0.1WuXYf_5XtSLmwWR-nN3B-LMUIUzJ2quN6VJfOXwtKk';

// Modificamos esta parte para usar sessionStorage en lugar de localStorage
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: window.sessionStorage, // <-- Esto es lo que hace la magia
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});