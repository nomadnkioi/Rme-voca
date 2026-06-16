import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.warn("Supabase URL or Key is missing. Using local mock storage.");
  
  // LocalStorage를 실제 Supabase 데이터 흐름처럼 다루는 Mock SDK 구성
  supabaseInstance = {
    from: () => {
      const getLocalData = () => JSON.parse(localStorage.getItem('my_vocab_list') || '[]');
      const saveLocalData = (data) => localStorage.setItem('my_vocab_list', JSON.stringify(data));
      
      const chain = {
        select: () => {
          return {
            order: () => Promise.resolve({ data: getLocalData(), error: null })
          };
        },
        insert: (records) => {
          const current = getLocalData();
          const mockData = records.map(r => ({
            id: Math.floor(Math.random() * 1000000),
            created_at: new Date().toISOString(),
            ...r
          }));
          const updated = [...current, ...mockData];
          saveLocalData(updated);
          return {
            select: () => Promise.resolve({ data: mockData, error: null })
          };
        },
        update: (fields) => {
          return {
            eq: (key, value) => {
              const current = getLocalData();
              const updated = current.map(r => r[key] === value ? { ...r, ...fields } : r);
              saveLocalData(updated);
              return {
                select: () => Promise.resolve({ data: [updated.find(r => r[key] === value)], error: null })
              };
            }
          };
        },
        delete: () => {
          return {
            eq: (key, value) => {
              const current = getLocalData();
              const filtered = current.filter(r => r[key] !== value);
              saveLocalData(filtered);
              return Promise.resolve({ error: null });
            }
          };
        }
      };
      return chain;
    }
  };
} else {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseInstance;
export { supabaseUrl, supabaseAnonKey };
