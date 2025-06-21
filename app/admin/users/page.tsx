import { createClient } from '@/lib/supabase/server';
import { UserTable } from './user-table';

export default async function UsersPage() {
  const supabase = createClient();
  const { data: users } = await supabase.from('profiles').select('*');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <UserTable users={users || []} />
    </div>
  );
}