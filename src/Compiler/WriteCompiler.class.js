import { Compiler } from "./Compiler.class.js"

import { numeric } from "./datatypes/numeric";
import { utils } from "./datatypes/utils";

import { conditionalDatatypes } from "./datatypes/compiler-conditional";
import { structuresDatatypes } from "./datatypes/compiler-structures";
import { utilsDatatypes } from "./datatypes/compiler-utils";

export class WriteCompiler extends Compiler {
  constructor () {
    super()

    this.addTypes(conditionalDatatypes.Write)
    this.addTypes(structuresDatatypes.Write)
    this.addTypes(utilsDatatypes.Write)

    // Add default types
    for (const key in numeric) {
      this.addNativeType(key, numeric[key][1])
    }
    for (const key in utils) {
      this.addNativeType(key, utils[key][1])
    }
  }

  compileType (type) {
    if (type instanceof Array) {
      if (this.parameterizableTypes[type[0]]) { return this.parameterizableTypes[type[0]](this, type[1]) }
      if (this.types[type[0]] && this.types[type[0]] !== 'native') {
        return this.wrapCode('return ' + this.callType('value', type[0], 'offset', Object.values(type[1])))
      }
      throw new Error('Unknown parametrizable type: ' + type[0])
    } else { // Primitive type
      if (type === 'native') return 'null'
      if (this.types[type]) { return 'ctx.' + type }
      return this.primitiveTypes[type]
    }
  }

  wrapCode (code, args = []) {
    if (args.length > 0) return '(value, buffer, offset, ' + args.join(', ') + ') => {\n' + this.indent(code) + '\n}'
    return '(value, buffer, offset) => {\n' + this.indent(code) + '\n}'
  }

  callType (value, type, offsetExpr = 'offset', args = []) {
    if (type instanceof Array) {
      if (this.types[type[0]] && this.types[type[0]] !== 'native') {
        return this.callType(value, type[0], offsetExpr, Object.values(type[1]))
      }
    }
    if (type instanceof Array && type[0] === 'container') this.scopeStack.push({})
    const code = this.compileType(type)
    if (type instanceof Array && type[0] === 'container') this.scopeStack.pop()
    if (args.length > 0) return '(' + code + `)(${value}, buffer, ${offsetExpr}, ` + args.map(name => this.getField(name)).join(', ') + ')'
    return '(' + code + `)(${value}, buffer, ${offsetExpr})`
  }
}
