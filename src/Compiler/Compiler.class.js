export class Compiler {
  constructor () {
    this.primitiveTypes = {}
    this.native = {}
    this.context = {}
    this.types = {}
    this.scopeStack = []
    this.parameterizableTypes = {}
  }

  /**
   * A native type is a type read or written by a function that will be called in it's
   * original context.
   * @param {*} type
   * @param {*} fn
   */
  addNativeType (type, fn) {
    this.primitiveTypes[type] = `native.${type}`
    this.native[type] = fn
    this.types[type] = 'native'
  }

  /**
   * A context type is a type that will be called in the protocol's context. It can refer to
   * registred native types using native.{type}() or context type (provided and generated)
   * using ctx.{type}(), but cannot access it's original context.
   * @param {*} type
   * @param {*} fn
   */
  addContextType (type, fn) {
    this.primitiveTypes[type] = `ctx.${type}`
    this.context[type] = fn.toString()
  }

  /**
   * A parametrizable type is a function that will be generated at compile time using the
   * provided maker function
   * @param {*} type
   * @param {*} maker
   */
  addParametrizableType (type, maker) {
    this.parameterizableTypes[type] = maker
  }

  addTypes (types) {
    for (const [type, [kind, fn]] of Object.entries(types)) {
      if (kind === 'native') this.addNativeType(type, fn)
      else if (kind === 'context') this.addContextType(type, fn)
      else if (kind === 'parametrizable') this.addParametrizableType(type, fn)
    }
  }

  addTypesToCompile (types) {
    for (const [type, json] of Object.entries(types)) {
      // Replace native type, otherwise first in wins
      if (!this.types[type] || this.types[type] === 'native') this.types[type] = json
    }
  }

  addProtocol (protocolData, path) {
    const self = this
    function recursiveAddTypes (protocolData, path) {
      if (protocolData === undefined) { return }
      if (protocolData.types) { self.addTypesToCompile(protocolData.types) }
      recursiveAddTypes(protocolData[path.shift()], path)
    }
    recursiveAddTypes(protocolData, path.slice(0))
  }

  indent (code, indent = '  ') {
    return code.split('\n').map((line) => indent + line).join('\n')
  }

  getField (name) {
    const path = name.split('/')
    let i = this.scopeStack.length - 1
    const reserved = ['value', 'enum', 'default', 'size', 'offset']
    while (path.length) {
      const scope = this.scopeStack[i]
      const field = path.shift()
      if (field === '..') {
        i--
        continue
      }
      // We are at the right level
      if (scope[field]) return scope[field] + (path.length ? ('.' + path.join('.')) : '')
      if (path.length !== 0) {
        throw new Error('Cannot access properties of undefined field')
      }
      // Count how many collision occured in the scope
      let count = 0
      if (reserved.includes(field)) count++
      for (let j = 0; j < i; j++) {
        if (this.scopeStack[j][field]) count++
      }
      scope[field] = field + (count || '') // If the name is already used, add a number
      return scope[field]
    }
    throw new Error('Unknown field ' + path)
  }

  generate () {
    this.scopeStack = [{}]
    const functions = []
    for (const type in this.context) {
      functions[type] = this.context[type]
    }
    for (const type in this.types) {
      if (!functions[type]) {
        if (this.types[type] !== 'native') {
          functions[type] = this.compileType(this.types[type])
          if (functions[type].startsWith('ctx')) {
            functions[type] = 'function () { return ' + functions[type] + '(...arguments) }'
          }
          if (!isNaN(functions[type])) { functions[type] = this.wrapCode('  return ' + functions[type]) }
        } else {
          functions[type] = `native.${type}`
        }
      }
    }
    return '() => {\n' + this.indent('const ctx = {\n' + this.indent(Object.keys(functions).map((type) => {
      return type + ': ' + functions[type]
    }).join(',\n')) + '\n}\nreturn ctx') + '\n}'
  }

  /**
   * Compile the given js code, providing native.{type} to the context, return the compiled types
   * @param {*} code
   */
  compile (code) {
    // Local variable to provide some context to eval()
    const native = this.native // eslint-disable-line
    const { PartialReadError } = require('./utils') // eslint-disable-line
    return eval(code)() // eslint-disable-line
  }
}
