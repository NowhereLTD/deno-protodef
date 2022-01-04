import { tryCatch } = from "./utils";

export class CompiledProtodef {
  constructor (sizeOfCtx, writeCtx, readCtx) {
    this.sizeOfCtx = sizeOfCtx
    this.writeCtx = writeCtx
    this.readCtx = readCtx
  }

  read (buffer, cursor, type) {
    const readFn = this.readCtx[type]
    if (!readFn) { throw new Error('missing data type: ' + type) }
    return readFn(buffer, cursor)
  }

  write (value, buffer, cursor, type) {
    const writeFn = this.writeCtx[type]
    if (!writeFn) { throw new Error('missing data type: ' + type) }
    return writeFn(value, buffer, cursor)
  }

  setVariable (key, val) {
    this.sizeOfCtx[key] = val
    this.readCtx[key] = val
    this.writeCtx[key] = val
  }

  sizeOf (value, type) {
    const sizeFn = this.sizeOfCtx[type]
    if (!sizeFn) { throw new Error('missing data type: ' + type) }
    if (typeof sizeFn === 'function') {
      return sizeFn(value)
    } else {
      return sizeFn
    }
  }

  createPacketBuffer (type, packet) {
    const length = tryCatch(() => this.sizeOf(packet, type),
      (e) => {
        e.message = `SizeOf error for ${e.field} : ${e.message}`
        throw e
      })
    const buffer = Buffer.allocUnsafe(length)
    tryCatch(() => this.write(packet, buffer, 0, type),
      (e) => {
        e.message = `Write error for ${e.field} : ${e.message}`
        throw e
      })
    return buffer
  }

  parsePacketBuffer (type, buffer, offset = 0) {
    const { value, size } = tryCatch(() => this.read(buffer, offset, type),
      (e) => {
        e.message = `Read error for ${e.field} : ${e.message}`
        throw e
      })
    return {
      data: value,
      metadata: { size },
      buffer: buffer.slice(0, size),
      fullBuffer: buffer
    }
  }
}
