import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const redirectUrl = new URL(`/login${request.nextUrl.search}`, request.url);
  return NextResponse.redirect(redirectUrl);
}
