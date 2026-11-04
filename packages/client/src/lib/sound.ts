import { Howl, Howler } from "howler";

type SoundName = "step" | "bump" | "signal" | "win" | "lose";

const muteKey = "blind-navigator.muted";
const sounds: Record<SoundName, Howl> = {
  step: new Howl({ src: ["/audio/step.mp3"] }),
  bump: new Howl({ src: ["/audio/bump.mp3"] }),
  signal: new Howl({ src: ["/audio/signal-received.mp3"] }),
  win: new Howl({ src: ["/audio/win.mp3"] }),
  lose: new Howl({ src: ["/audio/lose.mp3"] })
};

function isMuted(): boolean {
  return localStorage.getItem(muteKey) === "true";
}

export const sound = {
  play(name: SoundName): void {
    if (!isMuted()) {
      sounds[name].play();
    }
  },
  isMuted,
  setMuted(muted: boolean): void {
    localStorage.setItem(muteKey, String(muted));
    Howler.mute(muted);
  },
  toggleMuted(): boolean {
    const muted = !isMuted();
    this.setMuted(muted);
    return muted;
  }
};

Howler.mute(isMuted());

export type { SoundName };
