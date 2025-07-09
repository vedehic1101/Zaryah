import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

console.log('🔗 Connecting to Supabase:', supabaseUrl);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'giftflare-web'
    }
  },
  db: {
    schema: 'public'
  }
});

// Connection status tracking
let connectionStatus: 'connecting' | 'connected' | 'failed' = 'connecting';
let connectionAttempts = 0;
const maxAttempts = 3;
let autoRetryInterval: NodeJS.Timeout | null = null;

export const getConnectionStatus = () => connectionStatus;

const setAutoRetry = () => {
  if (autoRetryInterval) clearInterval(autoRetryInterval);
  autoRetryInterval = setInterval(() => {
    if (connectionStatus === 'failed') {
      console.log('🔄 Auto-retrying Supabase connection...');
      reconnect();
    }
  }, 60000); // Retry every 60 seconds
};

// Update connection status and set auto-retry if failed
const updateConnectionStatus = (status: 'connecting' | 'connected' | 'failed') => {
  connectionStatus = status;
  if (status === 'failed') setAutoRetry();
  else if (autoRetryInterval) clearInterval(autoRetryInterval);
};

// Enhanced connection test with better error handling
const testConnection = async () => {
  try {
    connectionAttempts++;
    console.log(`🔌 Testing Supabase connection (attempt ${connectionAttempts}/${maxAttempts})...`);
    // Test auth connection first
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('❌ Supabase auth error:', authError);
      if (connectionAttempts < maxAttempts) {
        console.log(`🔄 Retrying in 2 seconds...`);
        setTimeout(testConnection, 2000);
        return;
      }
      updateConnectionStatus('failed');
      return;
    }
    // Test database connection with a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    if (error) {
      console.error('❌ Supabase database error:', error);
      if (error.code === '42P01') {
        console.warn('⚠️ Database tables not found. Please run migrations.');
        updateConnectionStatus('failed');
        return;
      }
      if (connectionAttempts < maxAttempts) {
        console.log(`🔄 Retrying in 2 seconds...`);
        setTimeout(testConnection, 2000);
        return;
      }
      updateConnectionStatus('failed');
      return;
    }
    console.log('✅ Supabase connected successfully');
    updateConnectionStatus('connected');
    await testAdditionalTables();
  } catch (err) {
    console.error('❌ Supabase connection failed:', err);
    if (connectionAttempts < maxAttempts) {
      console.log(`🔄 Retrying in 2 seconds...`);
      setTimeout(testConnection, 2000);
    } else {
      updateConnectionStatus('failed');
    }
  }
};

// Test additional tables to ensure full functionality
const testAdditionalTables = async () => {
  const tables = ['products', 'orders', 'notifications', 'hero_videos', 'delivery_cities', 'themes'];
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      if (error) {
        console.warn(`⚠️ Table '${table}' not accessible:`, error.message);
      } else {
        console.log(`✅ Table '${table}' accessible`);
      }
    } catch (err) {
      console.warn(`⚠️ Error testing table '${table}':`, err);
    }
  }
};

// Initialize connection test with delay to avoid blocking app startup
setTimeout(() => {
  testConnection();
}, 500);

// Export connection utilities
export const reconnect = () => {
  connectionAttempts = 0;
  connectionStatus = 'connecting';
  testConnection();
};

// Health check function
export const healthCheck = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    return { healthy: !error, error };
  } catch (err) {
    return { healthy: false, error: err };
  }
};