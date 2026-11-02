import test from 'node:test';
import assert from 'node:assert/strict';
import { OutdoorMusic } from '../public/js/systems/OutdoorMusic.js';

test('outdoor melodies change with weather, avoid consecutive repeats and respect indoor/meditation audio', () => {
  const notes=[],audio={running:true,context:{currentTime:1},tone:(...args)=>notes.push(args)},music=new OutdoorMusic(audio);
  music.setWeather('clear',true);music.schedule();assert.ok(notes.length>0);const first=music.theme,clearNote=notes[0][0];
  audio.context.currentTime=music.nextTheme+1;music.schedule();assert.notEqual(music.theme,first);
  music.setWeather('rain',true);notes.length=0;music.schedule();assert.notEqual(notes[0][0],clearNote);assert.equal(notes[0][4],'sine');
  music.setWeather('fog',true);notes.length=0;music.schedule();assert.equal(notes[0][2],.011);
  music.setWeather('wind',false);notes.length=0;music.schedule();assert.equal(notes.length,0);
  music.setWeather('leaves',true);audio.meditationMusic=true;music.schedule();assert.equal(notes.length,0);
  audio.meditationMusic=false;audio.hallMusic=true;music.schedule();assert.equal(notes.length,0);
  audio.hallMusic=false;audio.running=false;music.schedule();assert.equal(notes.length,0);
});
