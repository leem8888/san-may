import { ITEMS, TREE_STAGES, treeStage } from '../shared/rules.js';
import { $, el, toast } from './dom.js';

// Garden gate (enter own / visit by code) and the in-garden toolbar. Every change goes through the server,
// which re-checks ownership; this class only chooses what to ask for.
export class GardenPanel {
  constructor({ net, game, panels, getMe, celebrate, applyScene, audio }) {
    Object.assign(this, { net, game, panels, getMe, celebrate, applyScene, audio }); this.tool = null; this.moving = false;
    game.pointHandler = point => this.point(point);
    $('#enterOwnGarden').onclick = () => this.enter();
    $('#visitForm').addEventListener('submit', event => { event.preventDefault(); this.enter($('#visitCode').value.trim()); });
    $('#copyGardenCode').onclick = async () => { try { await navigator.clipboard.writeText(this.scene?.garden?.code || ''); toast('Đã sao chép mã vườn. Bạn bè nhập mã này ở cổng vườn để ghé thăm.'); } catch { toast(`Mã vườn: ${this.scene?.garden?.code}`); } };
  }
  get scene() { return this.game.scene.garden !== undefined ? this.game.scene : null; }
  openGate() { this.panels.open('gardenGatePanel'); }
  async enter(code = '') {
    this.panels.close();
    await this.game.scenes.transition(async () => {
      try { const res = await this.net.request('garden:enter', code ? { code } : {}); this.applyScene(res.self, res.scene); }
      catch (error) { toast(error.message); }
    });
  }
  // Called whenever the current scene changes or the garden's objects are updated.
  refresh() {
    const scene = this.scene, garden = scene?.garden;
    $('#gardenBar').hidden = !garden;
    if (!garden) { this.tool = null; this.moving = false; return; }
    $('#gardenName').textContent = scene.isOwner ? 'Vườn của bạn' : `Vườn của ${garden.ownerName}`;
    $('#gardenCode').textContent = garden.code;
    $('#gardenCount').textContent = `${scene.objectsData.length}/40 vật`;
    const tools = [];
    if (scene.isOwner) {
      const owned = new Set(this.getMe()?.items || []);
      for (const [id, item] of Object.entries(ITEMS)) if (item.kind === 'decor') {
        const locked = !item.default && !owned.has(id);
        tools.push(el('button', { type: 'button', 'aria-pressed': String(this.tool === item.value), disabled: locked, title: locked ? 'Nhận từ nhiệm vụ' : `Đặt ${item.name}`, text: item.name, onclick: () => { this.tool = this.tool === item.value ? null : item.value; this.moving = false; this.refresh(); } }));
      }
      const selected = scene.selected;
      if (selected) {
        const stage = selected.type === 'tree' ? ` · ${TREE_STAGES[treeStage(selected.createdAt, selected.waterCount)]} · tưới ${selected.waterCount} lần` : '';
        tools.push(el('span', { class: 'selected', text: `Đang chọn: ${ITEMS[`decor:${selected.type}`]?.name || selected.type}${stage}` }),
          el('button', { type: 'button', 'aria-pressed': String(this.moving), text: 'Di chuyển', onclick: () => { this.moving = !this.moving; this.tool = null; this.refresh(); } }),
          el('button', { type: 'button', text: 'Cất đi', onclick: () => this.remove(selected) }));
        if (selected.type === 'tree') tools.push(el('button', { type: 'button', text: 'Tưới', onclick: () => this.water(selected) }));
      }
      $('#gardenHint').textContent = this.tool ? 'Chạm vào khu đất có viền vàng để đặt.' : this.moving ? 'Chạm vào chỗ mới để chuyển vật đã chọn.' : 'Chọn một vật để đặt, hoặc chạm vào vật trong vườn để chọn. Đứng gần cây và nhấn E để tưới.';
    } else $('#gardenHint').textContent = 'Bạn đang ghé thăm. Chỉ chủ vườn mới được trồng, sắp đặt và tưới cây.';
    $('#gardenTools').replaceChildren(...tools);
  }
  point(point) {
    const scene = this.scene;
    if (!scene?.isOwner) return false;
    if (this.tool) { this.place(this.tool, point); return true; }
    if (this.moving && scene.selected) { this.move(scene.selected, point); return true; }
    const hit = scene.objectAt(point.x, point.y);
    if (hit) { scene.selected = scene.selected?.id === hit.id ? null : hit; this.moving = false; this.refresh(); return true; }
    return false;
  }
  async call(event, payload, success) {
    try { const res = await this.net.request(event, payload); if (res.progress) this.celebrate({ progress: res.progress }); if (success) toast(success); this.audio.click(); return res; }
    catch (error) { toast(error.message); return null; }
  }
  async place(type, point) { if (await this.call('garden:place', { type, x: point.x, y: point.y }, type === 'tree' ? 'Đã gieo một hạt cây. Cây lớn dần theo thời gian và mỗi lần bạn tưới.' : null)) this.refresh(); }
  async move(object, point) { if (await this.call('garden:move', { id: object.id, x: point.x, y: point.y })) { this.moving = false; this.refresh(); } }
  async remove(object) { if (await this.call('garden:remove', { id: object.id }, 'Đã cất vật vào kho.')) { this.scene.selected = null; this.refresh(); } }
  async water(object) {
    const res = await this.call('garden:water', { id: object.id }, 'Đã tưới cây. Đất ẩm, lá xanh hơn.');
    if (res) this.game.player.act('interact');
  }
}
