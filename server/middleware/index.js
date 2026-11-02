import { RateLimiter } from '../services/moderation.js';

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  next();
}

export function requireAuth(identity) {
  return (req, res, next) => {
    const token = /^Bearer (.+)$/.exec(req.get('authorization') || '')?.[1];
    const player = identity.authenticate(token);
    if (!player) return res.status(401).json({ error: 'Phiên khách không hợp lệ. Hãy tải lại trang.' });
    req.playerId = player.id;
    next();
  };
}

export function rateLimit(capacity, perSecond, message = 'Bạn thao tác quá nhanh, hãy thử lại sau giây lát.') {
  const limiter = new RateLimiter(capacity, perSecond);
  const timer = setInterval(() => limiter.prune(), 60000); timer.unref();
  return (req, res, next) => limiter.take(req.ip || 'unknown') ? next() : res.status(429).json({ error: message });
}

export function noStore(req, res, next) { res.setHeader('Cache-Control', 'no-store'); next(); }

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Dữ liệu gửi lên quá lớn.' });
  if (error.type === 'entity.parse.failed' || error instanceof SyntaxError) return res.status(400).json({ error: 'Dữ liệu JSON không hợp lệ.' });
  console.error(error);
  res.status(500).json({ error: 'Máy chủ gặp lỗi. Hãy thử lại.' });
}
