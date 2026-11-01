import { NextResponse, type NextRequest } from 'next/server'

const adminPanelPath = process.env.ADMIN_PANEL_PATH?.trim().replace(/\/+$/, '')
const isValidAdminPanelPath =
  adminPanelPath !== undefined &&
  /^\/[a-zA-Z0-9/_-]+$/.test(adminPanelPath) &&
  !adminPanelPath.includes('//') &&
  adminPanelPath !== '/admin' &&
  adminPanelPath !== '/login'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  const isLoginRoute = pathname === '/login' || pathname.startsWith('/login/')

  if (!isValidAdminPanelPath) {
    return isAdminRoute || isLoginRoute
      ? NextResponse.redirect(new URL('/', request.url))
      : NextResponse.next()
  }

  if (pathname === adminPanelPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.rewrite(loginUrl)
  }

  if (pathname === `${adminPanelPath}/panel`) {
    const panelUrl = request.nextUrl.clone()
    panelUrl.pathname = '/admin'
    return NextResponse.rewrite(panelUrl)
  }

  if (isAdminRoute || isLoginRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}
