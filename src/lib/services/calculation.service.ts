import { CalculationRepository, type CreateCalcInput } from '@/lib/repositories/calculation.repository';
import { ProfileRepository } from '@/lib/repositories/profile.repository';
import { AppError } from '@/constants/error-codes';

const FREE_CALC_LIMIT = 5;

export class CalculationService {
  constructor(
    private calcRepo: CalculationRepository,
    private profileRepo: ProfileRepository
  ) {}

  async create(userId: string, data: Omit<CreateCalcInput, 'user_id'>) {
    // Check limit for free users
    const profile = await this.profileRepo.findById(userId);
    if (profile?.subscription_tier === 'free') {
      const count = await this.calcRepo.countByUser(userId);
      if (count >= FREE_CALC_LIMIT) {
        throw new AppError('CALC_LIMIT_EXCEEDED');
      }
    }

    return this.calcRepo.create({ ...data, user_id: userId });
  }

  async listByUser(userId: string, page: number, limit: number) {
    return this.calcRepo.findByUser(userId, { page, limit });
  }

  async getById(userId: string, id: string) {
    const calc = await this.calcRepo.findById(id);
    if (!calc) throw new AppError('NOT_FOUND', '계산을 찾을 수 없습니다');
    if (calc.user_id !== userId) throw new AppError('CALC_NOT_OWNER');
    return calc;
  }

  async delete(userId: string, id: string) {
    const calc = await this.calcRepo.findById(id);
    if (!calc) throw new AppError('NOT_FOUND', '계산을 찾을 수 없습니다');
    if (calc.user_id !== userId) throw new AppError('CALC_NOT_OWNER');
    await this.calcRepo.softDelete(id);
  }
}
