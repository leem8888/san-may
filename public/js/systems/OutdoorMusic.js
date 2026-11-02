// Original generated outdoor melodies, independent of meditation and hall chanting.
const MOODS = {
  clear: { root: 220, pace: 1.25, level: .018, voice: 'triangle' },
  leaves: { root: 196, pace: 1.65, level: .016, voice: 'triangle' },
  wind: { root: 146.83, pace: 2.4, level: .012, voice: 'sine' },
  rain: { root: 164.81, pace: 2.15, level: .014, voice: 'sine' },
  fog: { root: 130.81, pace: 3.1, level: .011, voice: 'sine' },
};
const MELODIES = [[0,4,7,9,7,4,2,0],[7,9,12,9,4,2,4,7],[0,2,4,7,4,2,0,-3],[4,7,9,12,7,4,2,0]];
export class OutdoorMusic {
  constructor(audio) { this.audio=audio; this.kind=null; this.enabled=false; this.theme=-1; this.step=0; this.nextNote=0; this.nextTheme=0; }
  setWeather(kind,enabled) {
    kind=MOODS[kind]?kind:'clear';
    if(this.kind!==kind||this.enabled!==enabled){this.kind=kind;this.enabled=enabled;this.nextNote=0;this.nextTheme=0;}
  }
  schedule() {
    const a=this.audio;if(!this.enabled||!a.running||a.meditationMusic||a.hallMusic)return;
    const t=a.context.currentTime,mood=MOODS[this.kind];
    if(t>=this.nextTheme){
      const choices=MELODIES.map((_,i)=>i).filter(i=>i!==this.theme);
      this.theme=choices[Math.floor(Math.random()*choices.length)];this.step=0;this.nextTheme=t+65+Math.random()*35;
    }
    this.nextNote=Math.max(t,this.nextNote);
    if(this.nextNote>t+.2)return;
    const index=this.step++%8,note=MELODIES[this.theme][index],when=this.nextNote;
    a.tone(mood.root*2**(note/12),mood.pace*1.6,mood.level,'music',mood.voice,1,when);
    if(index===0)a.tone(mood.root/2,mood.pace*4,mood.level*.45,'music','sine',1,when);
    this.nextNote=when+mood.pace*(index===7?2:1);
  }
}
