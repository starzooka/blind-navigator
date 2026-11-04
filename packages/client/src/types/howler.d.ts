declare module "howler" {
  export class Howl {
    constructor(options: { src: string[] });
    play(): number;
  }

  export const Howler: {
    mute(muted: boolean): void;
  };
}
