import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const url = request.nextUrl.clone();

  const isPrivate = url.pathname.startsWith('/private');
  const isRoot = url.pathname === '/' || url.pathname === '';
  const isLanding = url.pathname.startsWith('/landing');

  if (isLanding) return NextResponse.next();

  if (!token) {
    if (isRoot) return NextResponse.redirect(new URL('/landing', request.url));
    if (isPrivate) return NextResponse.redirect(new URL('/authentication/login', request.url));
    return NextResponse.next();
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET as string)
    );

    // 🔹 estrai ruolo come stringa sicura
    const ruoloRaw = (payload as Record<string, any>)?.role || (payload as Record<string, any>)?.ruolo;
    const ruolo = typeof ruoloRaw === 'string' ? ruoloRaw.toLowerCase() : '';

    if (ruolo === 'client' && isPrivate) {
      return NextResponse.redirect(new URL('/authentication/login', request.url));
    }

    if (ruolo === 'client' && isRoot) {
      return NextResponse.redirect(new URL('/landing', request.url));
    }

    if ((ruolo === 'admin' || ruolo === 'dipen') && isRoot) {
      return NextResponse.redirect(new URL('/private/admin/comande', request.url));
    }

    return NextResponse.next();

  } catch (err) {
    console.error('Errore verifica token:', err);
    if (isPrivate) return NextResponse.redirect(new URL('/authentication/login', request.url));
    return NextResponse.redirect(new URL('/landing', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|authentication|landing|tavoli|api/public|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|pdf)).*)',
  ],
};
