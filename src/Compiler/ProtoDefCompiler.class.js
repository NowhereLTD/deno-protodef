export class ProtoDefCompiler {
  constructor () {
    this.readCompiler = new ReadCompiler()
    this.writeCompiler = new WriteCompiler()
    this.sizeOfCompiler = new SizeOfCompiler()
  }

  addTypes (types) {
    this.readCompiler.addTypes(types.Read)
    this.writeCompiler.addTypes(types.Write)
    this.sizeOfCompiler.addTypes(types.SizeOf)
  }

  addTypesToCompile (types) {
    this.readCompiler.addTypesToCompile(types)
    this.writeCompiler.addTypesToCompile(types)
    this.sizeOfCompiler.addTypesToCompile(types)
  }

  addProtocol (protocolData, path) {
    this.readCompiler.addProtocol(protocolData, path)
    this.writeCompiler.addProtocol(protocolData, path)
    this.sizeOfCompiler.addProtocol(protocolData, path)
  }

  addVariable (key, val) {
    this.readCompiler.addContextType(key, val)
    this.writeCompiler.addContextType(key, val)
    this.sizeOfCompiler.addContextType(key, val)
  }

  compileProtoDefSync (options = { printCode: false }) {
    const sizeOfCode = this.sizeOfCompiler.generate()
    const writeCode = this.writeCompiler.generate()
    const readCode = this.readCompiler.generate()
    if (options.printCode) {
      console.log('// SizeOf:')
      console.log(sizeOfCode)
      console.log('// Write:')
      console.log(writeCode)
      console.log('// Read:')
      console.log(readCode)
    }
    const sizeOfCtx = this.sizeOfCompiler.compile(sizeOfCode)
    const writeCtx = this.writeCompiler.compile(writeCode)
    const readCtx = this.readCompiler.compile(readCode)
    return new CompiledProtodef(sizeOfCtx, writeCtx, readCtx)
  }
}





module.exports = {
  ReadCompiler,
  WriteCompiler,
  SizeOfCompiler,
  ProtoDefCompiler,
  CompiledProtodef
}
