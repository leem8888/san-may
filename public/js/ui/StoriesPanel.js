import { $, el, toast } from './dom.js';

// Curated, sourced readings for the library desk (public/data/stories.json).
export class StoriesPanel {
  constructor({ net, panels }) {
    Object.assign(this, { net, panels }); this.data = null; this.current = null; this.desk = null;
    $('#storyBack').onclick = () => this.list();
    $('#storyDone').onclick = () => this.done();
  }
  async open(desk) {
    this.desk = desk; this.panels.open('storiesPanel');
    try {
      if (!this.data) { const response = await fetch('/data/stories.json', { signal: AbortSignal.timeout(8000) }); if (!response.ok) throw Error('Không tải được sách.'); this.data = await response.json(); }
      $('#storiesNote').textContent = this.data.note; this.list();
    } catch (error) { toast(error.message); }
  }
  list() {
    $('#storyView').hidden = true; $('#storyList').hidden = false;
    $('#storyList').replaceChildren(...this.data.items.map(item => el('button', { type: 'button', onclick: () => this.read(item) }, el('strong', { text: item.title }), el('small', { text: `${item.kind} · ${item.source}` }))));
  }
  read(item) {
    this.current = item;
    $('#storyList').hidden = true; $('#storyView').hidden = false;
    $('#storyKind').textContent = item.kind; $('#storyHeading').textContent = item.title; $('#storyText').textContent = item.text;
    $('#storyReflect').textContent = `Suy ngẫm: ${item.reflect}`; $('#storySource').textContent = `Nguồn: ${item.source}`;
    $('#storyDone').disabled = false; $('#storyHeading').scrollIntoView({ block: 'nearest' });
  }
  async done() {
    if (!this.current || !this.desk) return;
    $('#storyDone').disabled = true;
    try { await this.net.request('activity:complete', { objectId: this.desk.id, title: this.current.title }); toast('Đã ghi vào nhật ký. Cảm ơn bạn đã đọc chậm.'); }
    catch (error) { toast(error.message); $('#storyDone').disabled = false; }
  }
}
