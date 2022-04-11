var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var i18n_exports = {};
__export(i18n_exports, {
  i18n: () => i18n
});
module.exports = __toCommonJS(i18n_exports);
var import_de = __toESM(require("../../admin/i18n/de.json"));
var import_en = __toESM(require("../../admin/i18n/en.json"));
var import_es = __toESM(require("../../admin/i18n/es.json"));
var import_fr = __toESM(require("../../admin/i18n/fr.json"));
var import_it = __toESM(require("../../admin/i18n/it.json"));
var import_nl = __toESM(require("../../admin/i18n/nl.json"));
var import_pl = __toESM(require("../../admin/i18n/pl.json"));
var import_pt = __toESM(require("../../admin/i18n/pt.json"));
var import_ru = __toESM(require("../../admin/i18n/ru.json"));
var import_zh_cn = __toESM(require("../../admin/i18n/zh-cn.json"));
class I18n {
  constructor() {
    this.language = "en";
    this.isFloatComma = false;
  }
  getStringOrTranslated(key) {
    if (import_en.default[key]) {
      return {
        de: import_de.default[key] || key,
        en: import_en.default[key] || key,
        es: import_es.default[key] || key,
        fr: import_fr.default[key] || key,
        it: import_it.default[key] || key,
        nl: import_nl.default[key] || key,
        pl: import_pl.default[key] || key,
        pt: import_pt.default[key] || key,
        ru: import_ru.default[key] || key,
        "zh-cn": import_zh_cn.default[key] || key
      };
    } else {
      return key;
    }
  }
  getString(key, ...args) {
    let str;
    switch (this.language) {
      case "de":
        str = import_de.default[key] || key;
        break;
      case "en":
        str = import_en.default[key] || key;
        break;
      case "es":
        str = import_es.default[key] || key;
        break;
      case "fr":
        str = import_fr.default[key] || key;
        break;
      case "it":
        str = import_it.default[key] || key;
        break;
      case "nl":
        str = import_nl.default[key] || key;
        break;
      case "pl":
        str = import_pl.default[key] || key;
        break;
      case "pt":
        str = import_pt.default[key] || key;
        break;
      case "ru":
        str = import_ru.default[key] || key;
        break;
      case "zh-cn":
        str = import_zh_cn.default[key] || key;
        break;
      default:
        str = key;
    }
    for (const s of args) {
      str = str.replace("%s", s);
    }
    return str;
  }
}
const i18n = new I18n();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  i18n
});
//# sourceMappingURL=i18n.js.map