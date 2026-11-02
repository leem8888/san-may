// REST client for non-realtime data. The guest token lives in LocalStorage and is also the recovery code.
export class Api {
  constructor(storage, key = 'sanmay-token', base = '') { this.storage = storage; this.key = key; this.base = base; this.token = storage.get(key, ''); }
  async request(method, path, body, { auth = true, timeout = 8000 } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && this.token) headers.Authorization = `Bearer ${this.token}`;
    let response;
    try { response = await fetch(`${this.base}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeout) }); }
    catch { throw Object.assign(Error('Không liên lạc được máy chủ. Kiểm tra kết nối rồi thử lại.'), { status: 0 }); }
    let data = {};
    try { data = await response.json(); } catch { /* empty or non-JSON body */ }
    if (!response.ok) throw Object.assign(Error(data.error || `Máy chủ trả lỗi ${response.status}.`), { status: response.status, data });
    return data;
  }
  get(path) { return this.request('GET', path); }
  post(path, body = {}) { return this.request('POST', path, body); }
  put(path, body = {}) { return this.request('PUT', path, body); }
  delete(path) { return this.request('DELETE', path); }
  setToken(token) { this.token = token; this.storage.set(this.key, token); }
  async ensureGuest(name = '') {
    if (this.token) {
      try { return (await this.get('/me')).player; }
      catch (error) { if (error.status !== 401) throw error; }
    }
    const data = await this.request('POST', '/guest', { name }, { auth: false });
    this.setToken(data.token);
    return data.player;
  }
  // Switches this browser to another guest identity using its recovery code.
  async recover(token) {
    const previous = this.token;
    this.token = String(token).trim();
    try { const player = (await this.get('/me')).player; this.setToken(this.token); return player; }
    catch (error) { this.token = previous; throw error.status === 401 ? Error('Mã khôi phục không đúng.') : error; }
  }
}
