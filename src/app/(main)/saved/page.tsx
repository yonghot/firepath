import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SavedCalculationsList } from '@/components/features/saved/saved-list';

export default async function SavedPage() {
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
