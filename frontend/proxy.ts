import { NextResponse, type NextRequest } from 'next/server'

const envAdminPath = process.env.ADMIN_PANEL_PATH?.trim().replace(/\/+$/, '')
const adminPanelPath = envAdminPath && envAdminPath.startsWith('/') ? envAdminPath : '/admin-panel'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Direct admin panel routes: /admin-panel or configured ADMIN_PANEL_PATH
  if (
    pathname === adminPanelPath ||
    pathname === `${adminPanelPath}/panel` ||
    pathname === '/admin-panel' ||
    pathname === '/admin-panel/panel'
  ) {
    const adminUrl = request.nextUrl.clone()
    adminUrl.pathname = '/admin'
    return NextResponse.rewrite(adminUrl)
  }

  // 2. Direct /admin route (renders admin page and AdminLoginForm)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.next()
  }

  // 3. /login is dedicated to participants
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    return NextResponse.next()
  }

  return NextResponse.next()
}
