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
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result)
    __defProp(target, key, result);
  return result;
};
var commands_exports = {};
__export(commands_exports, {
  DiscordAdapterSlashCommands: () => DiscordAdapterSlashCommands
});
module.exports = __toCommonJS(commands_exports);
var import_autobind_decorator = require("autobind-decorator");
var import_discord = require("discord.js");
var import_builders = require("@discordjs/builders");
var import_rest = require("@discordjs/rest");
var import_v9 = require("discord-api-types/v9");
var import_i18n = require("./lib/i18n");
var import_node_util = require("node:util");
class DiscordAdapterSlashCommands {
  constructor(adapter) {
    this.rest = new import_rest.REST({ version: "9" });
    this.cmdGetStateName = "iob-get";
    this.cmdSetStateName = "iob-set";
    this.registerCommandsDone = false;
    this.lastCommandsJson = null;
    this.commandObjectConfig = new import_discord.Collection();
    this.triggerDelayedRegisterSlashCommandsTimeout = null;
    this.adapter = adapter;
  }
  async onReady() {
    if (this.adapter.config.cmdGetStateName) {
      this.cmdGetStateName = this.adapter.config.cmdGetStateName;
    }
    if (this.adapter.config.cmdSetStateName) {
      this.cmdSetStateName = this.adapter.config.cmdSetStateName;
    }
    this.rest.setToken(this.adapter.config.token);
    if (!this.adapter.config.enableCommands) {
      return;
    }
    if (!this.adapter.client) {
      throw new Error("Tried to setup interaction handler for commands, but client is not initialized!");
    }
    this.adapter.client.on("interactionCreate", this.onInteractionCreate);
  }
  async registerSlashCommands() {
    var _a;
    this.registerCommandsDone = false;
    if (!((_a = this.adapter.client) == null ? void 0 : _a.user)) {
      throw new Error("Discord client not available");
    }
    if (!this.adapter.config.enableCommands) {
      this.adapter.log.debug("Commands not enabled");
      for (const [, guild] of this.adapter.client.guilds.cache) {
        const guildCommands = await guild.commands.fetch();
        if (guildCommands.size > 0) {
          this.adapter.log.debug(`Currently ${guildCommands.size} commands registered for server ${guild.name}. Removing them...`);
          try {
            await this.rest.put(import_v9.Routes.applicationGuildCommands(this.adapter.client.user.id, guild.id), { body: [] });
            this.adapter.log.info(`Removed commands for server ${guild.name} cause commands are not enabled`);
          } catch (err) {
            this.adapter.log.warn(`Error while removing registered commands for server ${guild.name}: ${err}`);
          }
        }
      }
      return;
    }
    const cmdGet = new import_builders.SlashCommandBuilder().setName(this.cmdGetStateName).setDescription(import_i18n.i18n.getString("Get an ioBroker state value"));
    const cmdSet = new import_builders.SlashCommandBuilder().setName(this.cmdSetStateName).setDescription(import_i18n.i18n.getString("Set an ioBroker state value"));
    cmdGet.setDefaultPermission(!this.adapter.config.enableAuthorization);
    cmdSet.setDefaultPermission(!this.adapter.config.enableAuthorization);
    cmdGet.addStringOption((opt) => {
      opt.setName("state").setDescription(import_i18n.i18n.getString("The ioBroker state to get")).setRequired(true);
      for (const [, objCfg] of this.commandObjectConfig) {
        if (objCfg.get) {
          opt.addChoice(objCfg.name, objCfg.alias);
        }
      }
      return opt;
    });
    cmdSet.addStringOption((opt) => {
      opt.setName("state").setDescription(import_i18n.i18n.getString("The ioBroker state to set")).setRequired(true);
      for (const [, objCfg] of this.commandObjectConfig) {
        if (objCfg.set) {
          opt.addChoice(objCfg.name, objCfg.alias);
        }
      }
      return opt;
    });
    cmdSet.addStringOption((opt) => {
      return opt.setName("value").setDescription(import_i18n.i18n.getString("The value to set")).setRequired(true);
    });
    const commands = [
      cmdGet,
      cmdSet
    ];
    const commandsJson = commands.map((cmd) => cmd.toJSON());
    if (!(0, import_node_util.isDeepStrictEqual)(commandsJson, this.lastCommandsJson)) {
      this.adapter.log.debug("Commands needs to be updated");
      if (this.commandObjectConfig.size === 0) {
        this.adapter.log.warn("Commands are enabled but not configured for any state object! Use the custom configuration of a state object to activate commands on it.");
      }
      const numGet = this.commandObjectConfig.filter((c) => c.get === true).size;
      const numSet = this.commandObjectConfig.filter((c) => c.set === true).size;
      for (const [, guild] of this.adapter.client.guilds.cache) {
        try {
          await this.rest.put(import_v9.Routes.applicationGuildCommands(this.adapter.client.user.id, guild.id), { body: commandsJson });
          const guildCommands = await guild.commands.fetch();
          if (this.adapter.config.enableAuthorization) {
            for (const [, gCmd] of guildCommands) {
              try {
                const permissions = [];
                for (const au of this.adapter.config.authorizedUsers) {
                  if (gCmd.name === this.cmdGetStateName && au.getStates || gCmd.name === this.cmdSetStateName && au.setStates) {
                    permissions.push({
                      id: au.userId,
                      type: "USER",
                      permission: true
                    });
                  }
                }
                await gCmd.permissions.set({ permissions });
              } catch (err) {
                this.adapter.log.warn(`Error while setting command permissions for server ${guild.name} command ${gCmd.name}: ${err}`);
              }
            }
          }
          this.adapter.log.info(`Registered commands for server ${guild.name} (id:${guild.id}) (get: ${numGet}, set: ${numSet})`);
        } catch (err) {
          this.adapter.log.warn(`Error registering commands for server ${guild.name} (id:${guild.id}): ${err}`);
        }
      }
      this.lastCommandsJson = commandsJson;
    } else {
      this.adapter.log.debug("Commands seams to be up to date");
    }
    this.registerCommandsDone = true;
  }
  setupCommandObject(objId, cfg) {
    if (cfg) {
      const conflictingAlias = this.commandObjectConfig.find((coc) => coc.alias === (cfg == null ? void 0 : cfg.alias) && coc.id !== cfg.id);
      if (conflictingAlias) {
        this.adapter.log.warn(`Command alias ${cfg.alias} of object ${cfg.id} already in use by object ${conflictingAlias.id}! ${cfg.id} will be ignored.`);
        cfg = null;
      }
    }
    if (!cfg) {
      if (this.commandObjectConfig.has(objId)) {
        this.commandObjectConfig.delete(objId);
        this.triggerDelayedRegisterSlashCommands();
      }
      return;
    }
    const currentCfg = this.commandObjectConfig.get(objId);
    if (!(0, import_node_util.isDeepStrictEqual)(cfg, currentCfg)) {
      this.adapter.log.debug(`Update command configuration for ${objId}: ${JSON.stringify(cfg)}`);
      this.commandObjectConfig.set(objId, cfg);
      this.triggerDelayedRegisterSlashCommands();
    }
  }
  triggerDelayedRegisterSlashCommands() {
    if (!this.adapter.initialCustomObjectSetupDone)
      return;
    if (this.triggerDelayedRegisterSlashCommandsTimeout) {
      this.adapter.clearTimeout(this.triggerDelayedRegisterSlashCommandsTimeout);
    }
    this.adapter.setTimeout(() => {
      this.triggerDelayedRegisterSlashCommandsTimeout = null;
      this.adapter.log.debug("Starting delayed slash commands registration...");
      this.registerSlashCommands();
    }, 5e3);
  }
  async onInteractionCreate(interaction) {
    if (!interaction.isCommand())
      return;
    const { commandName, user } = interaction;
    if (!this.registerCommandsDone) {
      this.adapter.log.warn(`Got command ${commandName} but command registration is not done yet.`);
      return;
    }
    this.adapter.log.debug(`Got command ${commandName} ${interaction.toJSON()}`);
    switch (commandName) {
      case this.cmdGetStateName:
        if (this.adapter.checkUserAuthorization(user.id, { getStates: true })) {
          await this.handleCmdGetState(interaction);
        } else {
          this.adapter.log.warn(`User ${user.tag} (id:${user.id}) is not authorized to call /${commandName} commands!`);
          interaction.reply(import_i18n.i18n.getString("You are not authorized to call this command!"));
        }
        break;
      case this.cmdSetStateName:
        if (this.adapter.checkUserAuthorization(user.id, { setStates: true })) {
          await this.handleCmdSetState(interaction);
        } else {
          this.adapter.log.warn(`User ${user.tag} (id:${user.id}) is not authorized to call /${commandName} commands!`);
          interaction.reply(import_i18n.i18n.getString("You are not authorized to call this command!"));
        }
        break;
      default:
        this.adapter.log.warn(`Got unknown command ${commandName}!`);
        interaction.reply(import_i18n.i18n.getString("Unknown command!"));
    }
  }
  async handleCmdGetState(interaction) {
    var _a, _b, _c, _d, _e, _f;
    await interaction.deferReply();
    const objAlias = interaction.options.getString("state");
    const cfg = this.commandObjectConfig.find((coc) => coc.alias === objAlias);
    if (!cfg) {
      await interaction.editReply(import_i18n.i18n.getString("Object `%s` not found!", objAlias || ""));
      return;
    }
    const obj = await this.adapter.getForeignObjectAsync(cfg.id);
    if (!obj) {
      await interaction.editReply(import_i18n.i18n.getString("Object `%s` not found!", cfg.id));
      return;
    }
    if (obj.type !== "state") {
      await interaction.editReply(import_i18n.i18n.getString("Object `%s` is not of type state!", cfg.id));
      return;
    }
    const state = await this.adapter.getForeignStateAsync(cfg.id);
    if (!state) {
      await interaction.editReply(import_i18n.i18n.getString("State `%s` not found!", cfg.id));
      return;
    }
    let val = "";
    if (obj.common.role === "date" && (obj.common.type === "string" && typeof state.val === "string" || obj.common.type === "number" && typeof state.val === "number")) {
      const d = new Date(state.val);
      val = d.toLocaleString(import_i18n.i18n.language, { dateStyle: "full", timeStyle: "long" });
    } else {
      switch (obj.common.type) {
        case "boolean":
          if (state.val) {
            val = ((_a = obj.common.custom) == null ? void 0 : _a[this.adapter.namespace].commandsBooleanValueTrue) || import_i18n.i18n.getString("true");
          } else {
            val = ((_b = obj.common.custom) == null ? void 0 : _b[this.adapter.namespace].commandsBooleanValueFalse) || import_i18n.i18n.getString("false");
          }
          break;
        case "number":
          const decimals = ((_d = (_c = obj.common.custom) == null ? void 0 : _c[this.adapter.namespace]) == null ? void 0 : _d.commandsNumberDecimals) || 0;
          if (typeof state.val === "number") {
            val = state.val.toFixed(decimals);
          } else if (state.val === null) {
            val = "_NULL_";
          } else {
            val = state.val.toString() || "NaN";
          }
          if (import_i18n.i18n.isFloatComma) {
            val = val.replace(".", ",");
          }
          break;
        default:
          if (typeof state.val === "string") {
            val = state.val;
          } else if (state.val === null) {
            val = "_NULL_";
          } else {
            val = state.val.toString();
          }
      }
    }
    const unit = obj.common.unit ? ` ${obj.common.unit}` : "";
    const ack = ((_f = (_e = obj.common.custom) == null ? void 0 : _e[this.adapter.namespace]) == null ? void 0 : _f.commandsShowAckFalse) && !state.ack ? ` (_${import_i18n.i18n.getString("not acknowledged")}_)` : "";
    this.adapter.log.debug(`Get command for ${cfg.id} - ${val}${unit}${ack}`);
    try {
      await interaction.editReply(`${cfg.name}: ${val}${unit}${ack}`);
    } catch (err) {
      this.adapter.log.warn(`Error sending interaction reply for /${this.cmdGetStateName} command! ${err}`);
    }
  }
  async handleCmdSetState(interaction) {
    interaction.deferReply();
    interaction.editReply("Not supported yet.");
  }
}
__decorateClass([
  import_autobind_decorator.boundMethod
], DiscordAdapterSlashCommands.prototype, "onInteractionCreate", 1);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DiscordAdapterSlashCommands
});
//# sourceMappingURL=commands.js.map