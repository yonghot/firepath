import type { SupabaseClient } from '@supabase/supabase-js';

export class GuideRepository {
  constructor(private supabase: SupabaseClient) {}

  async findBySlug(slug: string) {
    const { data, error } = await this.supabase
      .from('guides')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('guides')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}
