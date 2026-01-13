'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkProject() {
      try {
        const { count } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true });

        if (count && count > 0) {
          router.push('/dashboard');
        } else {
          router.push('/setup');
        }
      } catch (error) {
        console.error('Error checking projects:', error);
        // Default to setup on error
        router.push('/setup');
      }
    }

    checkProject();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
