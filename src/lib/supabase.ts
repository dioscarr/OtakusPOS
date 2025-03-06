import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please connect to Supabase using the "Connect to Supabase" button.');
}

// Configure retry options
const RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // 1 second

// Create Supabase client with custom fetch implementation
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'top-pos',
      'apikey': supabaseAnonKey,
    },
    fetch: async (url, options = {}) => {
      let lastError;
      
      console.log('[Supabase] Request:', { 
        url, 
        method: options.method || 'GET',
        headers: options.headers,
        hasBody: options.body ? true : false
      });
      
      for (let i = 0; i < RETRY_COUNT; i++) {
        try {
          const fullHeaders = {
            ...options.headers,
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          };
          
          // Fix the Content-Type header logic
          if (options.body && !(options.body instanceof FormData)) {
            fullHeaders['Content-Type'] = 'application/json';
          }
          
          fullHeaders['Accept'] = 'application/json';
          fullHeaders['Cache-Control'] = 'no-cache';
          fullHeaders['Pragma'] = 'no-cache';
          
          if (i > 0) {
            console.log(`[Supabase] Retry attempt ${i} for:`, url);
          }
          
          const response = await fetch(url, {
            ...options,
            headers: fullHeaders
          });
          
          if (!response.ok) {
            // Try to get response text for better debugging
            let responseText;
            try {
              responseText = await response.text();
              console.log(`[Supabase] Response body: ${responseText}`);
            } catch (e) {
              responseText = 'Unable to get response text';
            }
            
            console.error(
              `[Supabase] HTTP error! status: ${response.status}, response: ${responseText.substring(0, 500)}`
            );
            
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return response;
        } catch (error) {
          lastError = error;
          console.error(`[Supabase] Request failed (attempt ${i+1}/${RETRY_COUNT}):`, error);
          
          // Don't wait on the last attempt
          if (i < RETRY_COUNT - 1) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          }
        }
      }
      
      throw lastError;
    }
  }
});

console.log('Supabase client initialized with URL:', supabaseUrl);