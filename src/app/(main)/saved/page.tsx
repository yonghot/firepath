import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { SavedCalculationsList } from '@/components/features/saved/saved-list';

export const metadata: Metadata = {
  title: 'Saved Calculations',
  description: 'Your saved FIRE calculation scenarios.',
  robots: { index: false, follow: false },
};

export default async function SavedPage() {
  // Backend not configured: redirect to login instead of 500ing (createClient
  // throws on missing env). Guard BEFORE createClient()/cookies().
  if (!isSupabaseConfigured()) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">Saved Calculations</h1>
      <SavedCalculationsList />
    </div>
  );
}
