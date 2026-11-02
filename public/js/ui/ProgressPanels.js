import { ITEMS, LIMITS, ROUND } from '../shared/rules.js';
import { $, el, timeAgo, toast } from './dom.js';
import { clock } from './MeditationPanel.js';

const ICONS = { gate: '⛩', bow: '⌄', beads: '◌', meditate: '◎', bell: '♪', lantern: '✧', map: '✦', tree: '❦', friends: '∞', wish: '✉' };

// Quests, journal and profile/achievements. All numbers come from the server; nothing here grants progress.
export class ProgressPanels {
  constructor({ api, panels, getMe, setMe, onItems, editLook }) {
    Object.assign(this, { api, panels, getMe, setMe, onItems, editLook });
    panels.on('questPanel', () => this.quests());
    panels.on('journalPanel', () => this.journal());
    panels.on('profilePanel', () => this.profile());
    $('#noteForm').addEventListener('submit', event => { event.preventDefault(); this.note(); });
    $('#note').addEventListener('input', () => { $('#noteCount').textContent = `${$('#note').value.length}/${LIMITS.journal}`; });
    $('#editLook').onclick = () => { panels.close(); editLook(); };
  }
  async quests() {
    try {
      const data = await this.api.get('/quests');
      const section = (period, title) => el('section', { class: 'quest-group' }, el('h3', { text: title }), data.quests.filter(q => q.period === period).map(q => el('article', { class: `quest${q.completed ? ' done' : ''}` },
        el('div', { class: 'row' }, el('strong', { text: q.title }), el('small', { text: `${q.progress}/${q.target}` })),
        el('progress', { max: q.target, value: q.progress, 'aria-label': q.title }),
        el('div', { class: 'row' }, el('small', { text: `Thưởng: ${q.rewardName}${q.rewardOwned ? ' (đã có)' : ''}` }),
          q.claimed ? el('small', { class: 'ok', text: 'Đã nhận' }) : q.completed ? el('button', { type: 'button', text: 'Nhận', onclick: () => this.claim(q) }) : null))));
      $('#questList').replaceChildren(section('daily', `Hôm nay · ${data.periods.daily}`), section('weekly', `Tuần này · ${data.periods.weekly}`));
    } catch (error) { toast(error.message); }
  }
  async claim(quest) {
    try {
      const res = await this.api.post(`/quests/${quest.id}/claim`);
      this.onItems(res.items);
      toast(res.granted ? `Đã nhận ${res.itemName}. Xem trong Hồ sơ hoặc khi đổi trang phục / trang trí vườn.` : `Hoàn thành “${quest.title}”. Bạn đã có ${res.itemName} từ trước; việc làm này được ghi vào nhật ký.`);
      this.quests();
    } catch (error) { toast(error.message); }
  }
  // Stories the player has lived through, chapter by chapter, and how well they know each NPC.
  async stories() {
    const data = await this.api.get('/stories');
    const blocks = data.stories.map(s => el('article', { class: 'entry' }, el('strong', { text: `${s.title}${s.status === 'completed' ? ' · đã trọn' : ''}` }),
      s.chapters.map(c => el('div', { class: `story-chapter ${c.status}` }, el('strong', { text: `Chương ${c.n} · ${c.status === 'locked' ? '…' : c.title}` }),
        c.beats.length ? el('ul', {}, c.beats.map(b => el('li', { text: b.text }))) : null,
        c.status === 'active' && s.objective ? el('p', { class: 'now', text: `Việc tiếp theo: ${s.objective.text}${s.objective.hint ? ` (${s.objective.hint})` : ''}` }) : null))));
    const npcs = data.npcs.length ? el('p', { class: 'hint', text: data.npcs.map(n => `${n.name}: ${n.familiarity.toLowerCase()}`).join(' · ') }) : null;
    $('#storyJournal').replaceChildren(...(blocks.length ? blocks : [el('p', { class: 'empty', text: 'Chưa có câu chuyện nào. Hãy trò chuyện với mọi người trong chùa — ai có điều muốn kể sẽ có dấu ! bên cạnh tên.' })]), ...(npcs ? [npcs] : []));
    const memories = data.memories || [];
    $('#memoryJournal').replaceChildren(...(memories.length ? memories.map(m => el('article', { class: 'entry' }, el('time', { text: timeAgo(m.createdAt) }), el('p', { text: m.text }))) : [el('p', { class: 'empty', text: 'Chưa có kỷ niệm chung. Mở “Mọi người” và bấm “Cùng chơi” để rủ ai đó thưởng trà, thiền hay thỉnh chuông cùng bạn.' })]));
  }
  async journal() {
    try {
      this.stories().catch(error => toast(error.message));
      const data = await this.api.get('/journal'), p = data.progress;
      $('#journalStats').replaceChildren(...[['Lạy', p.bowsTotal], ['Lần hạt', p.beadsTotal], ['Phút thiền', Math.floor(p.meditationSeconds / 60)], ['Hoa đăng', p.lanternsTotal], ['Lời chúc', p.wishesTotal], ['Cây đã gieo', p.treesPlanted]].map(([label, value]) => el('div', {}, el('b', { text: String(value) }), el('small', { text: label }))));
      $('#meditationHistory').replaceChildren(...(data.meditations.length ? data.meditations.map(m => el('li', { text: `${timeAgo(m.startedAt)} · ${clock(m.actualSeconds)} / ${clock(m.plannedSeconds)}${m.shared ? ' · cùng bạn' : ''}` })) : [el('li', { text: 'Chưa có phiên thiền nào.' })]));
      $('#journalEntries').replaceChildren(...(data.entries.length ? data.entries.map(e => el('article', { class: `entry ${e.kind}` }, el('time', { text: timeAgo(e.createdAt) }), el('p', { text: e.text }),
        e.kind === 'note' ? el('button', { type: 'button', class: 'link', text: 'Xoá', onclick: () => this.removeNote(e) }) : null)) : [el('p', { class: 'empty', text: 'Nhật ký còn trống. Những việc bạn làm trong chùa sẽ được ghi lại ở đây.' })]));
    } catch (error) { toast(error.message); }
  }
  async note() {
    const text = $('#note').value.trim();
    if (!text) return;
    try { await this.api.post('/journal', { text }); $('#note').value = ''; $('#noteCount').textContent = `0/${LIMITS.journal}`; this.journal(); } catch (error) { toast(error.message); }
  }
  async removeNote(entry) { try { await this.api.delete(`/journal/${entry.id}`); this.journal(); } catch (error) { toast(error.message); } }
  async profile() {
    try {
      const me = (await this.api.get('/me')).player; this.setMe(me);
      const p = me.progress;
      $('#profileName').textContent = me.name;
      $('#profileStats').replaceChildren(...[['Vòng lạy hiện tại', `${p.bowsRound}/${ROUND}`], ['Vòng chuỗi hiện tại', `${p.beadsRound}/${ROUND}`], ['Vòng 108 lạy trọn', p.bowRounds], ['Vòng chuỗi trọn', p.beadRounds], ['Lần thỉnh chuông', p.bellsTotal], ['Khu đã ghé', `${p.scenesVisited.length}/8`]].map(([label, value]) => el('div', {}, el('b', { text: String(value) }), el('small', { text: label }))));
      const owned = me.items.filter(id => !ITEMS[id]?.default);
      $('#profileItems').replaceChildren(...(owned.length ? owned.map(id => el('span', { class: `item ${ITEMS[id]?.kind}`, text: ITEMS[id]?.name || id })) : [el('small', { text: 'Chưa có vật phẩm thưởng. Hoàn thành nhiệm vụ để nhận trang phục, phụ kiện, đồ trang trí và huy hiệu.' })]));
      const unlocked = me.achievements.filter(a => a.unlockedAt).length;
      $('#achievementCount').textContent = `${unlocked}/${me.achievements.length}`;
      $('#achievementList').replaceChildren(...me.achievements.map(a => el('article', { class: `achievement${a.unlockedAt ? ' unlocked' : ''}` }, el('span', { class: 'icon', 'aria-hidden': 'true', text: ICONS[a.icon] || '✦' }),
        el('div', {}, el('strong', { text: a.title }), el('small', { text: a.unlockedAt ? `${a.description} · ${new Date(a.unlockedAt).toLocaleDateString('vi-VN')}` : a.description }), a.rewardName ? el('small', { class: 'reward', text: `Thưởng: ${a.rewardName}` }) : null))));
    } catch (error) { toast(error.message); }
  }
}
