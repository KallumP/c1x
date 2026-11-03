// building the game's little endian structures a field at a time

export class ByteWriter {
  private chunks: Buffer[] = [];
  private written = 0;

  get length(): number {
    return this.written;
  }

  private field(size: number, write: (chunk: Buffer) => void): this {
    const chunk = Buffer.alloc(size);
    write(chunk);
    return this.bytes(chunk);
  }

  u8(value: number): this {
    return this.field(1, (chunk) => chunk.writeUInt8(value));
  }

  u16(value: number): this {
    return this.field(2, (chunk) => chunk.writeUInt16LE(value));
  }

  s16(value: number): this {
    return this.field(2, (chunk) => chunk.writeInt16LE(value));
  }

  u32(value: number): this {
    return this.field(4, (chunk) => chunk.writeUInt32LE(value));
  }

  s32(value: number): this {
    return this.field(4, (chunk) => chunk.writeInt32LE(value));
  }

  bytes(data: Buffer): this {
    this.chunks.push(data);
    this.written += data.length;
    return this;
  }

  // zeros up to size bytes in all
  padTo(size: number): this {
    return this.written < size ? this.bytes(Buffer.alloc(size - this.written)) : this;
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.chunks, this.written);
  }
}

// data with zeros after it to a multiple of 4 bytes
export function padTo4(data: Buffer): Buffer {
  const padding = (4 - (data.length % 4)) % 4;
  return padding ? Buffer.concat([data, Buffer.alloc(padding)]) : data;
}

export function readWords(data: Buffer, offset: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => data.readUInt32LE(offset + 4 * index));
}
