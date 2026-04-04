import type { SupabaseClient } from '@supabase/supabase-js';

export interface CreateCalcInput {
  user_id: string;
  name: string;
  input_params: Record<string, unknown>;
  results: Record<string, unknown>;
  is_default?: boolean;
}

export class CalculationRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(data: CreateCalcInput) {
    const { data: record, error } = await this.supabase
      .from('saved_calculations')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return record;
  }

  async findByUser(userId: string, opts: { page: number; limit: number }) {
    const offset = (opts.page - 1) * opts.limit;

    const { data: items, error, count } = await this.supabase
      .from('saved_calculations')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + opts.limit - 1);

    if (error) throw error;
    return { items: items || [], total: count || 0 };
  }

  async findById(id: string) {
    const { data, error } = await this.supabase
      .from('saved_calculations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;
    return data;
  }

  async countByUser(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('saved_calculations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (error) throw error;
    return count || 0;
  }

  async softDelete(id: string) {
    const { error } = await this.supabase
      .from('saved_calculations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }
}
