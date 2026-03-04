import { describe, it, expect, vi } from 'vitest';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

describe('middleware', () => {
  it('returns 401 if no session cookie', () => {
    const req = new NextRequest('http://localhost/api/survey/save');
    const res = middleware(req);
    expect(res.status).toBe(401);
  });

  it('passes if authjs.session-token is present', () => {
    const req = new NextRequest('http://localhost/api/survey/save');
    req.cookies.set('authjs.session-token', 'token');
    
    // NextResponse.next() returns a response with status 200 by default (which means continue)
    const res = middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('passes if __Secure-authjs.session-token is present', () => {
    const req = new NextRequest('http://localhost/api/survey/save');
    req.cookies.set('__Secure-authjs.session-token', 'token');
    
    const res = middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});
