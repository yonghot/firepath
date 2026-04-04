import type { SupabaseClient } from '@supabase/supabase-js';

export class ProfileRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  async updateTier(userId: string, tier: 'free' | 'premium') {
    const { error } = await this.supabase
      .from('profiles')
      .update({ subscription_tier: tier })
      .eq('id', userId);

    if (error) throw error;
  }
}
