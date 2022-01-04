import { Compiler } from "./Compiler.class.js"

import { numeric } from "./datatypes/numeric";
import { utils } from "./datatypes/utils";

import { conditionalDatatypes } from "./datatypes/compiler-conditional";
import { structuresDatatypes } from "./datatypes/compiler-structures";
import { utilsDatatypes } from "./datatypes/compiler-utils";

export class ReadCompiler extends Compiler {
  constructor () {
    super()

    this.addTypes(conditionalDatatypes.Read)
    this.addTypes(structuresDatatypes.Read)
    this.addTypes(utilsDatatypes.Read)

    // Add default types
    for (const key in numeric) {
      this.addNativeType(key, numeric[key][0])
    }
    for (const key in utils) {
      this.addNativeType(key, utils[key][0])
    }
  }

  compileType (type) {
    if (type instanceof Array) {
      if (this.parameterizableTypes[type[0]]) { return this.parameterizableTypes[type[0]](this, type[1]) }
      if (this.types[type[0]] && this.types[type[0]] !== 'native') {
        return this.wrapCode('return ' + this.callType(type[0], 'offset', Object.values(type[1])))
      }
      throw new Error('Unknown parametrizable type: ' + JSON.stringify(type[0]))
    } else { // Primitive type
      if (type === 'native') return 'null'
      if (this.types[type]) { return 'ctx.' + type }
      return this.primitiveTypes[type]
    }
  }

  wrapCode (code, args = []) {
    if (args.length > 0) return '(buffer, offset, ' + args.join(', ') + ') => {\n' + this.indent(code) + '\n}'
    return '(buffer, offset) => {\n' + this.indent(code) + '\n}'
  }

  callType (type, offsetExpr = 'offset', args = []) {
    if (type instanceof Array) {
      if (this.types[type[0]] && this.types[type[0]] !== 'native') {
        return this.callType(type[0], offsetExpr, Object.values(type[1]))
      }
    }
    if (type instanceof Array && type[0] === 'container') this.scopeStack.push({})
    const code = this.compileType(type)
    if (type instanceof Array && type[0] === 'container') this.scopeStack.pop()
    if (args.length > 0) return '(' + code + `)(buffer, ${offsetExpr}, ` + args.map(name => this.getField(name)).join(', ') + ')'
    return '(' + code + `)(buffer, ${offsetExpr})`
  }
}
