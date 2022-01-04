export class Parser extends TransformStream {
  constructor (proto, mainType) {
    super({ readableObjectMode: true })
    this.proto = proto
    this.mainType = mainType
    this.queue = Buffer.alloc(0)
  }

  parsePacketBuffer (buffer) {
    return this.proto.parsePacketBuffer(this.mainType, buffer)
  }

  _transform (chunk, enc, cb) {
    this.queue = Buffer.concat([this.queue, chunk])
    while (true) {
      let packet
      try {
        packet = this.parsePacketBuffer(this.queue)
      } catch (e) {
        if (e.partialReadError) { return cb() } else {
          e.buffer = this.queue
          this.queue = Buffer.alloc(0)
          return cb(e)
        }
      }

      this.push(packet)
      this.queue = this.queue.slice(packet.metadata.size)
    }
  }
}
