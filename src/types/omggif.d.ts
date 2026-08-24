declare module "omggif" {
  export type GifWriterOptions = {
    loop?: number;
    palette?: number[];
    background?: number;
  };

  export type GifFrameOptions = {
    palette?: number[];
    transparent?: number;
    disposal?: number;
    delay?: number;
  };

  export class GifWriter {
    constructor(
      buffer: number[] | Uint8Array,
      width: number,
      height: number,
      options?: GifWriterOptions,
    );
    addFrame(
      x: number,
      y: number,
      width: number,
      height: number,
      indexedPixels: number[] | Uint8Array,
      options?: GifFrameOptions,
    ): number;
    end(): number;
    getOutputBuffer(): number[] | Uint8Array;
    getOutputBufferPosition(): number;
  }

  export class GifReader {
    constructor(buffer: Uint8Array);
    numFrames(): number;
    numColors(): number;
    width?: number;
    height?: number;
    decodeAndBlitFrameRGBA(frameIndex: number, pixels: Uint8Array): void;
  }
}
