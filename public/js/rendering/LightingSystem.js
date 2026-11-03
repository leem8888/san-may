// Ambient light is a multiply pass tinted by time of day; lamps, candles and the moon add light on top.
export class LightingSystem {
  ambient(c, width, height, env, indoor) {
    const [r, g, b] = env.tint, k = indoor ? Math.min(env.darkness, .22) + .08 : env.darkness;
    if (k <= .005) return;
    // Multiplying by a colour between white and the tint darkens and tints in one pass.
    const mix = v => Math.round(255 + (v - 255) * k);
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = indoor ? `rgb(${mix(255)},${mix(190)},${mix(130)})` : `rgb(${mix(r)},${mix(g)},${mix(b)})`;
    c.fillRect(0, 0, width, height);
    c.globalCompositeOperation = 'source-over';
  }
  lights(c, lights, camera, env, indoor, time) {
    const strength = indoor ? .85 : Math.max(.12, env.lamps);
    c.globalCompositeOperation = 'lighter';
    for (const light of lights) {
      if (!camera.visible(light.x, light.y, light.r)) continue;
      const flicker = light.flicker ? 1 + Math.sin(time * 9 + light.x) * .05 + Math.sin(time * 23 + light.y) * .03 : 1;
      const radius = light.r * flicker, g = c.createRadialGradient(light.x, light.y, 1, light.x, light.y, radius);
      g.addColorStop(0, `rgba(${light.color},${.42 * strength * (light.power ?? 1)})`); g.addColorStop(.45, `rgba(${light.color},${.14 * strength * (light.power ?? 1)})`); g.addColorStop(1, `rgba(${light.color},0)`);
      c.fillStyle = g; c.fillRect(light.x - radius, light.y - radius, radius * 2, radius * 2);
    }
    c.globalCompositeOperation = 'source-over';
  }
  // Screen-space fog/mist and moonlight; cheap gradients, no per-pixel work.
  atmosphere(c, width, height, env, fog, time, indoor) {
    const motionTime = env.reduced ? 0 : time;
    if (!indoor && env.night) {
      const moon = c.createRadialGradient(width * .82, -40, 10, width * .82, -40, height * .9);
      moon.addColorStop(0, `rgba(170,190,235,${.16 * env.darkness})`); moon.addColorStop(1, 'rgba(170,190,235,0)');
      c.fillStyle = moon; c.fillRect(0, 0, width, height);
    }
    const mist = indoor ? 0 : Math.max(fog, env.phase === 'morning' ? .25 : 0);
    if (mist > .01) {
      for (let i = 0; i < 3; i++) {
        const y = height * (.25 + i * .28) + Math.sin(motionTime * .1 + i) * 30, x = (motionTime * (8 + i * 4) + i * 300) % (width + 600) - 300;
        const g = c.createRadialGradient(x, y, 10, x, y, width * .55);
        g.addColorStop(0, `rgba(222,232,226,${.15 * mist})`); g.addColorStop(1, 'rgba(222,232,226,0)');
        c.fillStyle = g; c.fillRect(0, 0, width, height);
      }
      c.fillStyle = `rgba(214,226,222,${.07 * mist})`; c.fillRect(0, 0, width, height);
    }
  }
}
