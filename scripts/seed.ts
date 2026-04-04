/**
 * Seed Script — creates admin + demo accounts and sample calculations.
 *
 * Usage: npx tsx scripts/seed.ts
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Admin: admin@admin.com / admin123! [PROD-TODO: change credentials]
 * Demo:  demo@firepath.app / demo1234!
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.log('Skipping auth user creation. Guide seed data is already in DB.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  {
    email: 'admin@admin.com',
    password: 'admin123!',
    display_name: 'Admin',
    tier: 'premium' as const,
  },
  {
    email: 'demo@firepath.app',
    password: 'demo1234!',
    display_name: 'Demo User',
    tier: 'free' as const,
  },
];

const SAMPLE_CALCULATIONS = [
  {
    name: 'Default Plan',
    input_params: {
      currentAge: 30, retirementAge: 65, annualIncome: 80000,
      currentNetWorth: 50000, savingsRate: 0.3, annualExpenses: 40000,
      expectedReturn: 0.07, inflation: 0.03, safeWithdrawalRate: 0.04,
    },
    results: {
      lean: { targetAmount: 600000, yearsToReach: 16, reachAge: 46 },
      regular: { targetAmount: 1000000, yearsToReach: 24, reachAge: 54 },
      fat: { targetAmount: 1500000, yearsToReach: 31, reachAge: 61 },
      coast: { targetAmount: 264000, yearsToReach: 12, reachAge: 42 },
      barista: { targetAmount: 500000, yearsToReach: 14, reachAge: 44 },
    },
    is_default: true,
  },
  {
    name: 'Aggressive Saver',
    input_params: {
      currentAge: 28, retirementAge: 55, annualIncome: 120000,
      currentNetWorth: 100000, savingsRate: 0.5, annualExpenses: 35000,
      expectedReturn: 0.08, inflation: 0.03, safeWithdrawalRate: 0.04,
    },
    results: {
      lean: { targetAmount: 525000, yearsToReach: 7, reachAge: 35 },
      regular: { targetAmount: 875000, yearsToReach: 12, reachAge: 40 },
      fat: { targetAmount: 1312500, yearsToReach: 17, reachAge: 45 },
      coast: { targetAmount: 180000, yearsToReach: 2, reachAge: 30 },
      barista: { targetAmount: 437500, yearsToReach: 6, reachAge: 34 },
    },
    is_default: false,
  },
  {
    name: 'Conservative Plan',
    input_params: {
      currentAge: 35, retirementAge: 60, annualIncome: 60000,
      currentNetWorth: 20000, savingsRate: 0.2, annualExpenses: 45000,
      expectedReturn: 0.06, inflation: 0.03, safeWithdrawalRate: 0.04,
    },
    results: {
      lean: { targetAmount: 675000, yearsToReach: 28, reachAge: 63 },
      regular: { targetAmount: 1125000, yearsToReach: null, reachAge: null },
      fat: { targetAmount: 1687500, yearsToReach: null, reachAge: null },
      coast: { targetAmount: 520000, yearsToReach: 24, reachAge: 59 },
      barista: { targetAmount: 562500, yearsToReach: 26, reachAge: 61 },
    },
    is_default: false,
  },
];

async function seed() {
  console.log('Seeding FIREPath database...\n');

  for (const user of USERS) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { display_name: user.display_name },
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log(`User ${user.email} already exists, skipping.`);
        // Get existing user
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existing = users?.find(u => u.email === user.email);
        if (existing && user.tier === 'premium') {
          await supabase.from('profiles').update({ subscription_tier: 'premium' }).eq('id', existing.id);
          console.log(`  Updated ${user.email} to premium tier.`);
        }
        if (existing && user.email === 'demo@firepath.app') {
          // Seed calculations for demo user
          for (const calc of SAMPLE_CALCULATIONS) {
            const { error } = await supabase.from('saved_calculations').insert({
              ...calc,
              user_id: existing.id,
            });
            if (error && !error.message.includes('duplicate')) {
              console.error(`  Failed to seed calc "${calc.name}":`, error.message);
            } else {
              console.log(`  Seeded calculation: ${calc.name}`);
            }
          }
        }
        continue;
      }
      console.error(`Failed to create ${user.email}:`, authError.message);
      continue;
    }

    const userId = authData.user.id;
    console.log(`Created user: ${user.email} (${userId})`);

    // Update tier if premium
    if (user.tier === 'premium') {
      await supabase.from('profiles').update({ subscription_tier: 'premium' }).eq('id', userId);
      console.log(`  Set ${user.email} to premium tier.`);
    }

    // Seed calculations for demo user
    if (user.email === 'demo@firepath.app') {
      for (const calc of SAMPLE_CALCULATIONS) {
        const { error } = await supabase.from('saved_calculations').insert({
          ...calc,
          user_id: userId,
        });
        if (error) {
          console.error(`  Failed to seed calc "${calc.name}":`, error.message);
        } else {
          console.log(`  Seeded calculation: ${calc.name}`);
        }
      }
    }
  }

  console.log('\nSeed complete!');
  console.log('Admin: admin@admin.com / admin123! [PROD-TODO]');
  console.log('Demo:  demo@firepath.app / demo1234!');
}

seed().catch(console.error);
