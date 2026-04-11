import { GuideRepository } from '@/lib/repositories/guide.repository';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Guide service — read-only access to published guide content.
 * Pages must call this service instead of GuideRepository directly (3-Layer rule).
 */
export class GuideService {
  constructor(private guideRepo: GuideRepository) {}

  async getBySlug(slug: string) {
    return this.guideRepo.findBySlug(slug);
  }

  async listAll() {
    return this.guideRepo.findAll();
  }

  /**
   * Fetch a guide + related guides in a single round.
   * Used by /guide/[slug] page which needs both.
   */
  async getWithRelated(slug: string, relatedLimit = 3) {
    const [guide, all] = await Promise.all([
      this.guideRepo.findBySlug(slug),
      this.guideRepo.findAll(),
    ]);
    if (!guide) return { guide: null, related: [] };
    const related = all.filter((g) => g.slug !== slug).slice(0, relatedLimit);
    return { guide, related };
  }
}

/** Create a GuideService from an authenticated/anonymous supabase client. */
export function createGuideService(supabase: SupabaseClient): GuideService {
  return new GuideService(new GuideRepository(supabase));
}
