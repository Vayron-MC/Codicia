import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ktkijypjnamcblypdnsg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0a2lqeXBqbmFtY2JseXBkbnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDE3NDEsImV4cCI6MjA4MTA3Nzc0MX0.1WuXYf_5XtSLmwWR-nN3B-LMUIUzJ2quN6VJfOXwtKk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default supabase;