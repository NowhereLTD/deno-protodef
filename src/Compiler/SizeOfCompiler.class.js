import { Compiler } from "./Compiler.class.js"

import { numeric } from "./datatypes/numeric";
import { utils } from "./datatypes/utils";

import { conditionalDatatypes } from "./datatypes/compiler-conditional";
import { structuresDatatypes } from "./datatypes/compiler-structures";
import { utilsDatatypes } from "./datatypes/compiler-utils";



export class SizeOfCompiler extends Compiler {
  constructor () {
    super()

    this.addTypes(conditionalDatatypes.SizeOf)
    this.addTypes(structuresDatatypes.SizeOf)
    this.addTypes(utilsDatatypes.SizeOf)

    // Add default types
    for (const key in numeric) {
      this.addNativeType(key, numeric[key][2])
    }
    for (const key in utils) {
      this.addNativeType(key, utils[key][2])
    }
  }

  /**
   * A native type is a type read or written by a function that will be called in it's
   * original context.
   * @param {*} type
   * @param {*} fn
   */
  addNativeType (type, fn) {
    this.primitiveTypes[type] = `native.${type}`
    if (!isNaN(fn)) {
      this.native[type] = (value) => { return fn }
    } else {
      this.native[type] = fn
    }
    this.types[type] = 'native'
  }

  compileType (type) {
    if (type instanceof Array) {
      if (this.parameterizableTypes[type[0]]) { return this.parameterizableTypes[type[0]](this, type[1]) }
      if (this.types[type[0]] && this.types[type[0]] !== 'native') {
        return this.wrapCode('return ' + this.callType('value', type[0], Object.values(type[1])))
      }
      throw new Error('Unknown parametrizable type: ' + type[0])
    } else { // Primitive type
      if (type === 'native') return 'null'
      if (!isNaN(this.primitiveTypes[type])) return this.primitiveTypes[type]
      if (this.types[type]) { return 'ctx.' + type }
      return this.primitiveTypes[type]
    }
  }

  wrapCode (code, args = []) {
    if (args.length > 0) return '(value, ' + args.join(', ') + ') => {\n' + this.indent(code) + '\n}'
    return '(value) => {\n' + this.indent(code) + '\n}'
  }

  callType (value, type, args = []) {
    if (type instanceof Array) {
      if (this.types[type[0]] && this.types[type[0]] !== 'native') {
        return this.callType(value, type[0], Object.values(type[1]))
      }
    }
    if (type instanceof Array && type[0] === 'container') this.scopeStack.push({})
    const code = this.compileType(type)
    if (type instanceof Array && type[0] === 'container') this.scopeStack.pop()
    if (!isNaN(code)) return code
    if (args.length > 0) return '(' + code + `)(${value}, ` + args.map(name => this.getField(name)).join(', ') + ')'
    return '(' + code + `)(${value})`
  }
}
