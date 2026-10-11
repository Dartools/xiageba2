"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var chunk_L6V54WGO_exports = {};
__export(chunk_L6V54WGO_exports, {
  getEngineVersion: () => getEngineVersion,
  safeGetEngineVersion: () => safeGetEngineVersion
});
module.exports = __toCommonJS(chunk_L6V54WGO_exports);
var import_chunk_JOIHHXR6 = require("./chunk-JOIHHXR6.js");
var import_chunk_5PJQQKQI = require("./chunk-5PJQQKQI.js");
var import_chunk_5DBOS77Y = require("./chunk-5DBOS77Y.js");
var import_fetch_engine = require("@prisma/fetch-engine");
async function getEngineVersion(enginePath, binaryName) {
  enginePath = await (0, import_chunk_5PJQQKQI.resolveBinary)(binaryName ?? import_fetch_engine.BinaryType.SchemaEngineBinary, enginePath);
  const { stdout } = await (0, import_chunk_JOIHHXR6.execa)(enginePath, ["--version"]);
  return stdout;
}
function safeGetEngineVersion(enginePath, binaryName) {
  return (0, import_chunk_5DBOS77Y.tryCatch2)(
    () => getEngineVersion(enginePath, binaryName),
    (error) => error
  );
}
