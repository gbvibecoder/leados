'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const PUBLIC_PATHS = ['/', '/login', '/signup'];

/** Decode a JWT payload without verifying signature (client-side expiry check). */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false; // no exp claim — treat as valid
  return Date.now() >= payload.exp * 1000;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/funnel');

  useEffect(() => {
    if (isPublic) {
      setChecked(true);
      return;
    }

    const token = localStorage.getItem('leados_token');
    const user = localStorage.getItem('leados_user');

    if (!token || !user) {
      router.replace('/login');
      return;
    }

    // Check JWT expiry
    if (isTokenExpired(token)) {
      localStorage.removeItem('leados_token');
      localStorage.removeItem('leados_user');
      router.replace('/login');
      return;
    }

    // Validate that stored user JSON is valid
    try {
      JSON.parse(user);
    } catch {
      localStorage.removeItem('leados_token');
      localStorage.removeItem('leados_user');
      router.replace('/login');
      return;
    }

    setChecked(true);
  }, [pathname, isPublic, router]);

  if (!isPublic && !checked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return <>{children}</>;
}
