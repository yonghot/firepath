import type { SupabaseClient } from '@supabase/supabase-js';
import { wrapDbError } from './db-error';

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
    if (error) throw wrapDbError('guide.findBySlug', error);
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('guides')
      .select('*')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (error) throw wrapDbError('guide.findAll', error);
    return data || [];
  }
}
