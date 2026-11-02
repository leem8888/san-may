// Definitions are upserted on every boot so wording/reward fixes reach existing databases.
export const ACHIEVEMENTS = [
  { id: 'first-visit', title: 'Lần đầu ghé chùa', description: 'Bước qua cổng tam quan lần đầu tiên.', icon: 'gate', reward_item: null },
  { id: 'bow-108', title: 'Một trăm lẻ tám lạy', description: 'Hoàn thành trọn một vòng 108 lần lạy.', icon: 'bow', reward_item: null },
  { id: 'bead-108', title: 'Tròn một chuỗi hạt', description: 'Lần đủ 108 hạt trong một vòng.', icon: 'beads', reward_item: null },
  { id: 'meditation-first', title: 'Hơi thở đầu tiên', description: 'Hoàn thành trọn vẹn một phiên thiền.', icon: 'meditate', reward_item: null },
  { id: 'bell-first', title: 'Tiếng chuông đầu', description: 'Thỉnh chuông lần đầu.', icon: 'bell', reward_item: 'badge:bell' },
  { id: 'lantern-first', title: 'Ngọn đèn trên nước', description: 'Thả hoa đăng đầu tiên trên hồ sen.', icon: 'lantern', reward_item: 'badge:lotus' },
  { id: 'explorer', title: 'Lữ khách an nhiên', description: 'Ghé đủ tám khu vực của chùa.', icon: 'map', reward_item: 'badge:path' },
  { id: 'tree-first', title: 'Gieo một mầm xanh', description: 'Trồng cây đầu tiên trong khu vườn riêng.', icon: 'tree', reward_item: null },
  { id: 'shared-meditation', title: 'Cùng ngồi yên', description: 'Thiền cùng lúc với một người bạn trong cùng khu vực.', icon: 'friends', reward_item: null },
  { id: 'wish-first', title: 'Lời lành đầu tiên', description: 'Gửi lời chúc đầu tiên.', icon: 'wish', reward_item: null },
  { id: 'coop-tea', title: 'Chén trà đôi', description: 'Thưởng trọn một ấm trà cùng một người bạn.', icon: 'friends', reward_item: null },
  { id: 'coop-bell', title: 'Hai nhịp một tiếng chuông', description: 'Cùng một người bạn thỉnh đại hồng chung theo hơi thở.', icon: 'bell', reward_item: null },
  { id: 'coop-meditation', title: 'Ngồi yên bên nhau', description: 'Hoàn thành trọn một phiên thiền chung.', icon: 'meditate', reward_item: null },
  { id: 'coop-garden', title: 'Hai bàn tay làm vườn', description: 'Cùng bạn đưa góc vườn cũ lên một giai đoạn mới.', icon: 'tree', reward_item: null },
  { id: 'coop-puzzle', title: 'Hai mảnh một lời giải', description: 'Giải câu đố ký hiệu ở Tháp Chuông.', icon: 'map', reward_item: 'badge:twoKeys' },
];

export const QUESTS = [
  { id: 'd-bow', period: 'daily', metric: 'bows', target: 10, title: 'Lạy Phật 10 lần', reward_item: 'color:moss' },
  { id: 'd-meditate', period: 'daily', metric: 'meditation_seconds', target: 300, title: 'Thiền 5 phút', reward_item: 'decor:lotusPot' },
  { id: 'd-bell', period: 'daily', metric: 'bells', target: 3, title: 'Thỉnh chuông 3 lần', reward_item: 'decor:bench' },
  { id: 'd-wish', period: 'daily', metric: 'wishes', target: 1, title: 'Gửi một lời chúc', reward_item: 'color:lotus' },
  { id: 'd-walk', period: 'daily', metric: 'visit:zenGarden', target: 1, title: 'Đi dạo trong vườn thiền', reward_item: 'decor:bonsai' },
  { id: 'd-tree', period: 'daily', metric: 'water', target: 1, title: 'Chăm sóc một cây', reward_item: 'acc:scarf' },
  { id: 'w-bow', period: 'weekly', metric: 'bows', target: 108, title: 'Lạy đủ 108 lần trong tuần', reward_item: 'color:saffron' },
  { id: 'w-meditate', period: 'weekly', metric: 'meditation_seconds', target: 1800, title: 'Thiền tổng cộng 30 phút', reward_item: 'acc:lotus' },
  { id: 'w-lantern', period: 'weekly', metric: 'lanterns', target: 3, title: 'Thả 3 hoa đăng', reward_item: 'acc:hat' },
];

export function seed(db) {
  const achievement = db.prepare(`INSERT INTO achievements (id, title, description, icon, reward_item, sort) VALUES (@id, @title, @description, @icon, @reward_item, @sort)
    ON CONFLICT(id) DO UPDATE SET title = excluded.title, description = excluded.description, icon = excluded.icon, reward_item = excluded.reward_item, sort = excluded.sort`);
  const quest = db.prepare(`INSERT INTO quests (id, period, metric, target, title, reward_item, sort) VALUES (@id, @period, @metric, @target, @title, @reward_item, @sort)
    ON CONFLICT(id) DO UPDATE SET period = excluded.period, metric = excluded.metric, target = excluded.target, title = excluded.title, reward_item = excluded.reward_item, sort = excluded.sort`);
  db.transaction(() => {
    ACHIEVEMENTS.forEach((a, sort) => achievement.run({ ...a, sort }));
    QUESTS.forEach((q, sort) => quest.run({ ...q, sort }));
  })();
}
