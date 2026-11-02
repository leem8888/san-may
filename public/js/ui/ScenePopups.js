// One cleanup point for a real scene change, including reconnects and garden visits.
export function closeScenePopups({ panels, dialogue, minigames, game }) {
  panels.close(); panels.menu(false); dialogue?.close(); minigames?.close();
  const emotes = document.getElementById('emotes'); if (emotes) emotes.hidden = true;
  document.getElementById('emoteToggle')?.setAttribute('aria-expanded', 'false');
  document.getElementById('chatInput')?.blur();
  const garden = document.getElementById('gardenBar'); if (garden) garden.hidden = true;
  game.fortuneShake = 0;
}
