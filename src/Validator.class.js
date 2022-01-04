// Code from https://github.com/ProtoDef-io/node-protodef-validator
import Ajv from "./ajv.js";

import * as definitions from "../ProtoDef/schemas/definitions.json" assert { type: "json" };
import * as protocol_schema from "../ProtoDef/schemas/protocol_schema.json" assert { type: "json" };

import * as numeric from "../ProtoDef/schemas/numeric.json" assert { type: "json" };
import * as utils from "../ProtoDef/schemas/utils.json" assert { type: "json" };
import * as structures from "../ProtoDef/schemas/structures.json" assert { type: "json" };
import * as conditional from "../ProtoDef/schemas/conditional.json" assert { type: "json" };
import * as primitives from "../ProtoDef/schemas/primitives.json" assert { type: "json" };

export default class Validator {
  constructor(typesSchemas) {
    this.createAjvInstance(typesSchemas);
    this.addDefaultTypes();
  }

  createAjvInstance(typesSchemas) {
    this.typesSchemas = {};
    this.compiled=false;
    this.ajv = new Ajv({verbose:true});
    this.ajv.addSchema(definitions, "definitions");
    this.ajv.addSchema(protocol_schema, "protocol");
    if(typesSchemas) {
      Object.keys(typesSchemas).forEach(s => this.addType(s, typesSchemas[s]));
    }
  }

  addDefaultTypes() {
    this.addTypes(numeric);
    this.addTypes(utils);
    this.addTypes(structures);
    this.addTypes(conditional);
    this.addTypes(primitives);
  }

  addTypes(schemas) {
    Object.keys(schemas).forEach((name) => this.addType(name, schemas[name]));
  }

  typeToSchemaName(name) {
    return name.replace('|','_');
  }

  addType(name,schema) {
    const schemaName=this.typeToSchemaName(name);
    if(this.typesSchemas[schemaName] != undefined)
      return;

    if(!schema) { // default schema
      schema={
        "oneOf":[
          {"enum":[name]},
          {
            "type": "array",
              "items": [
                {"enum":[name]},
                {"oneOf":[{"type": "object"},{"type": "array"}]}
            ]
          }
        ]};
    }

    this.typesSchemas[schemaName]=schema;

    // recreate ajv instance to recompile dataType (and all depending types) when adding a type
    if(this.compiled)
      this.createAjvInstance(this.typesSchemas);
    else {
      this.ajv.addSchema(schema, schemaName);
    }


    this.ajv.removeSchema("dataType");
    this.ajv.addSchema({
      "title": "dataType",
      "oneOf": [{"enum":["native"]}].concat(Object.keys(this.typesSchemas).map(name => ({"$ref": this.typeToSchemaName(name)})))
    },"dataType");
  }

  validateType(type) {
    let valid = this.ajv.validate("dataType",type);
    this.compiled=true;
    if(!valid) {
      console.log(JSON.stringify(this.ajv.errors[0],null,2));
      if(this.ajv.errors[0]['parentSchema']['title']=="dataType") {
        this.validateTypeGoingInside(this.ajv.errors[0]['data']);
      }
      console.log(type);
      throw new Error("validation error");
    }
  }

  validateTypeGoingInside(type) {
    if(Array.isArray(type)) {
      if(this.typesSchemas[this.typeToSchemaName(type[0])]==undefined) {
        throw new Error(type + " is an undefined type");
      }

      let valid = this.ajv.validate(type[0],type);
      this.compiled=true;
      if(!valid) {
        console.log(JSON.stringify(this.ajv.errors[0],null,2));
        if(this.ajv.errors[0]['parentSchema']['title']=="dataType") {
          this.validateTypeGoingInside(this.ajv.errors[0]['data']);
        }
        throw new Error("validation error");
      }
    }
    else {
      if(type=="native")
        return;
      if(this.typesSchemas[this.typeToSchemaName(type)]==undefined) {
        throw new Error(type+" is an undefined type");
      }
    }
  }

  validateProtocol(protocol) {
    // 1. validate with protocol schema with basic datatype def
    let valid = this.ajv.validate("protocol",protocol);
    if(!valid) {
      throw new Error(JSON.stringify(this.ajv.errors,null,2));
    }


    // 2. recursively create several validator from current one and validate that
    function validateTypes(p,originalValidator,path) {
      const v=new Validator(originalValidator.typesSchemas);
      Object.keys(p).forEach(k => {
        if(k=="types") {
          // 2 steps for recursive types
          Object.keys(p[k]).forEach(typeName => v.addType(typeName));
          Object.keys(p[k]).forEach(typeName => {
            try {
              v.validateType(p[k][typeName], path + "." + k + "." + typeName);
            }
            catch(e) {
              throw new Error("Error at "+path + "." + k + "." + typeName);
            }
          });
        }
        else {
          validateTypes(p[k],v,path+"."+k);
        }
      })
    }
    validateTypes(protocol,this,"root");
  }
}
