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
var import_node_util = require("node:util");
var import_autobind_decorator = require("autobind-decorator");
var import_discord = require("discord.js");
var import_builders = require("@discordjs/builders");
var import_rest = require("@discordjs/rest");
var import_v10 = require("discord-api-types/v10");
var import_i18n = require("./lib/i18n");
var import_utils = require("./lib/utils");
class DiscordAdapterSlashCommands {
  constructor(adapter) {
    this.rest = new import_rest.REST({ version: "10" });
    this.cmdGetStateName = "iob-get";
    this.cmdSetStateName = "iob-set";
    this.cmdGetStateChoices = [];
    this.cmdSetStateChoices = [];
    this.customCommands = new import_discord.Collection();
    this.registerCommandsDone = false;
    this.lastCommandsJson = null;
    this.commandObjectConfig = new import_discord.Collection();
    this.lastInteractions = new import_discord.Collection();
    this.triggerDelayedRegisterSlashCommandsTimeout = null;
    this.wellKnownbooleanTrueValues = /* @__PURE__ */ new Set(["true", "on", "yes", "1"]);
    this.adapter = adapter;
  }
  async onReady() {
    if (this.adapter.config.cmdGetStateName) {
      if (this.adapter.config.cmdGetStateName.match(/^[a-z][0-9a-z-_]{1,32}$/)) {
        this.cmdGetStateName = this.adapter.config.cmdGetStateName;
      } else {
        this.adapter.log.warn(`Invalid custom get state command name '${this.adapter.config.cmdGetStateName}' provied! Using default 'iob-get'.`);
      }
    }
    if (this.adapter.config.cmdSetStateName) {
      this.cmdSetStateName = this.adapter.config.cmdSetStateName;
      if (this.adapter.config.cmdSetStateName.match(/^[a-z][0-9a-z-_]{1,32}$/)) {
        this.cmdSetStateName = this.adapter.config.cmdSetStateName;
      } else {
        this.adapter.log.warn(`Invalid custom set state command name '${this.adapter.config.cmdSetStateName}' provied! Using default 'iob-set'.`);
      }
    }
    this.rest.setToken(this.adapter.config.token);
    if (!this.adapter.config.enableCommands) {
      return;
    }
    this.wellKnownbooleanTrueValues.add(import_i18n.i18n.getString("true")).add(import_i18n.i18n.getString("on")).add(import_i18n.i18n.getString("yes"));
    if (!this.adapter.client) {
      throw new Error("Tried to setup interaction handler for commands, but client is not initialized!");
    }
    this.adapter.client.on("interactionCreate", this.onInteractionCreate);
  }
  async registerSlashCommands() {
    var _a, _b;
    this.registerCommandsDone = false;
    if (!((_a = this.adapter.client) == null ? void 0 : _a.user)) {
      throw new Error("Discord client not available");
    }
    if (this.adapter.unloaded)
      return;
    if (!this.adapter.config.enableCommands) {
      this.adapter.log.debug("Commands not enabled");
      for (const [, guild] of this.adapter.client.guilds.cache) {
        await this.removeGuildCommands(guild);
      }
      await this.removeGlobalCommands();
      return;
    }
    const commands = [];
    const numGet = this.commandObjectConfig.filter((c) => c.get === true).size;
    const numSet = this.commandObjectConfig.filter((c) => c.set === true).size;
    if (numGet > 0) {
      const cmdGet = new import_builders.SlashCommandBuilder().setName(this.cmdGetStateName).setDescription(import_i18n.i18n.getString("Get an ioBroker state value"));
      cmdGet.addStringOption((opt) => opt.setName("state").setDescription(import_i18n.i18n.getString("The ioBroker state to get")).setRequired(true).setAutocomplete(true));
      commands.push(cmdGet);
    }
    if (numSet > 0) {
      const cmdSet = new import_builders.SlashCommandBuilder().setName(this.cmdSetStateName).setDescription(import_i18n.i18n.getString("Set an ioBroker state value"));
      cmdSet.addStringOption((opt) => opt.setName("state").setDescription(import_i18n.i18n.getString("The ioBroker state to set")).setRequired(true).setAutocomplete(true));
      cmdSet.addStringOption((opt) => {
        return opt.setName("value").setDescription(import_i18n.i18n.getString("The value to set")).setRequired(true);
      });
      commands.push(cmdSet);
    }
    this.cmdGetStateChoices = [];
    this.cmdSetStateChoices = [];
    for (const [, objCfg] of this.commandObjectConfig) {
      if (objCfg.get) {
        this.cmdGetStateChoices.push({
          name: objCfg.name,
          value: objCfg.alias
        });
      }
      if (objCfg.set) {
        this.cmdSetStateChoices.push({
          name: objCfg.name,
          value: objCfg.alias
        });
      }
    }
    const sortFn = (a, b) => {
      if (a.name > b.name)
        return 1;
      if (a.name < b.name)
        return -1;
      return 0;
    };
    this.cmdGetStateChoices.sort(sortFn);
    this.cmdSetStateChoices.sort(sortFn);
    this.customCommands.clear();
    if (this.adapter.config.enableCustomCommands) {
      loopCustomCommands:
        for (const customCommandCfg of this.adapter.config.customCommands) {
          if (!customCommandCfg.name.match(/^[a-z][0-9a-z-_]{1,32}$/) || customCommandCfg.description.length === 0 || customCommandCfg.description.length > 100) {
            this.adapter.log.warn(`Custom command "${customCommandCfg.name}" has an invalid name or description configured!`);
            continue;
          }
          if (customCommandCfg.name === this.cmdGetStateName) {
            this.adapter.log.warn(`Custom command "${customCommandCfg.name}" is configured but conflicts with default get command! The command will be ignored.`);
            continue;
          }
          if (customCommandCfg.name === this.cmdSetStateName) {
            this.adapter.log.warn(`Custom command "${customCommandCfg.name}" is configured but conflicts with default set command! The command will be ignored.`);
            continue;
          }
          if (this.customCommands.has(customCommandCfg.name)) {
            this.adapter.log.warn(`Custom command "${customCommandCfg.name}" is configured multiple times! The command will be ignored.`);
            continue;
          }
          const cmdCustom = new import_builders.SlashCommandBuilder().setName(customCommandCfg.name).setDescription(customCommandCfg.description);
          const optionsChoices = new import_discord.Collection();
          const cmdOpts = /* @__PURE__ */ new Set();
          if (Array.isArray(customCommandCfg.options)) {
            if (customCommandCfg.options.length > 25) {
              this.adapter.log.warn(`Custom command "${customCommandCfg.name}" has more than 25 options configured! Only the first 25 options will be used.`);
              customCommandCfg.options.splice(25);
            }
          } else {
            customCommandCfg.options = [];
          }
          await this.setupCustomCommandIobObjects(customCommandCfg);
          for (const customCommandCfgOpt of customCommandCfg.options) {
            if (!customCommandCfgOpt.name.match(/^[a-z][0-9a-z-_]{1,32}$/) || customCommandCfgOpt.description.length === 0 || customCommandCfgOpt.description.length > 100) {
              this.adapter.log.warn(`Custom command "${customCommandCfg.name}" option "${customCommandCfgOpt.name}" has an invalid name or description configured!`);
              continue loopCustomCommands;
            }
            if (cmdOpts.has(customCommandCfgOpt.name)) {
              this.adapter.log.warn(`Custom command "${customCommandCfg.name}" option "${customCommandCfgOpt.name}" is configured multiple times! The command will be ignored.`);
              continue loopCustomCommands;
            }
            cmdOpts.add(customCommandCfgOpt.name);
            switch (customCommandCfgOpt.type) {
              case "string":
                let choices = [];
                try {
                  const val = ((_b = await this.adapter.getStateAsync(`slashCommands.${customCommandCfg.name}.option-${customCommandCfgOpt.name}.choices`)) == null ? void 0 : _b.val) ?? "[]";
                  if (typeof val !== "string") {
                    this.adapter.log.warn(`Value of ${this.adapter.namespace}.slashCommands.${customCommandCfg.name}.option-${customCommandCfgOpt.name}.choices is not a string!`);
                  } else {
                    choices = JSON.parse(val);
                  }
                } catch (err) {
                  this.adapter.log.warn(`Could not parse JSON from ${this.adapter.namespace}.slashCommands.${customCommandCfg.name}.option-${customCommandCfgOpt.name}.choices! ${err}`);
                }
                optionsChoices.set(customCommandCfgOpt.name, choices.map((choice) => {
                  if (typeof choice === "string" && choice.length >= 1 && choice.length <= 100) {
                    return { name: choice, value: choice };
                  } else if (typeof choice === "object" && typeof choice.value === "string" && typeof choice.name === "string" && choice.name.length >= 1 && choice.name.length <= 100 && choice.value.length <= 100) {
                    return { name: choice.name, value: choice.value };
                  } else {
                    this.adapter.log.warn(`Choice ${JSON.stringify(choice)} is not valid for ${this.adapter.namespace}.slashCommands.${customCommandCfg.name}.option-${customCommandCfgOpt.name}.choices and will be ignored!`);
                    return null;
                  }
                }).filter((choice) => choice !== null));
                cmdCustom.addStringOption((opt) => {
                  opt.setName(customCommandCfgOpt.name).setDescription(customCommandCfgOpt.description).setRequired(!!customCommandCfgOpt.required);
                  if (choices.length > 0) {
                    opt.setAutocomplete(true);
                  }
                  return opt;
                });
                break;
              case "number":
                cmdCustom.addNumberOption((opt) => opt.setName(customCommandCfgOpt.name).setDescription(customCommandCfgOpt.description).setRequired(!!customCommandCfgOpt.required));
                break;
              case "boolean":
                cmdCustom.addBooleanOption((opt) => opt.setName(customCommandCfgOpt.name).setDescription(customCommandCfgOpt.description).setRequired(!!customCommandCfgOpt.required));
                break;
              case "user":
                cmdCustom.addUserOption((opt) => opt.setName(customCommandCfgOpt.name).setDescription(customCommandCfgOpt.description).setRequired(!!customCommandCfgOpt.required));
                break;
              case "role":
                cmdCustom.addRoleOption((opt) => opt.setName(customCommandCfgOpt.name).setDescription(customCommandCfgOpt.description).setRequired(!!customCommandCfgOpt.required));
                break;
              case "channel":
                cmdCustom.addChannelOption((opt) => opt.setName(customCommandCfgOpt.name).setDescription(customCommandCfgOpt.description).setRequired(!!customCommandCfgOpt.required));
                break;
              case "mentionable":
                cmdCustom.addMentionableOption((opt) => opt.setName(customCommandCfgOpt.name).setDescription(customCommandCfgOpt.description).setRequired(!!customCommandCfgOpt.required));
                break;
              default:
                this.adapter.log.warn(`Custom command "${customCommandCfg.name}" option "${customCommandCfgOpt.name} has an invalid type set"!`);
                continue loopCustomCommands;
            }
          }
          commands.push(cmdCustom);
          this.customCommands.set(customCommandCfg.name, optionsChoices);
        }
      const objListSlashCommands = await this.adapter.getObjectListAsync({
        startkey: `${this.adapter.namespace}.slashCommands.`,
        endkey: `${this.adapter.namespace}.slashCommands.\u9999`
      });
      const re = new RegExp(`^${this.adapter.name}\\.${this.adapter.instance}\\.slashCommands\\.([^.]+)$`);
      for (const item of objListSlashCommands.rows) {
        const m = item.id.match(re);
        if (m) {
          const cmdName = m[1];
          if (!this.customCommands.has(cmdName)) {
            this.adapter.log.debug(`Custom slash command ${cmdName} is not configured - deleting objects`);
            await this.adapter.delObjectAsyncCached(`slashCommands.${cmdName}`, { recursive: true });
          }
        }
      }
    }
    if (commands.length === 0) {
      if (this.adapter.config.enableCustomCommands) {
        this.adapter.log.warn("Commands are enabled but not configured for any state object and no custom commands are configured! Use the custom configuration of a state object to activate commands on it or add custom commands in the adapter instance configuration.");
      } else {
        this.adapter.log.warn("Commands are enabled but not configured for any state object! Use the custom configuration of a state object to activate commands on it.");
      }
    }
    const commandsJson = commands.map((cmd) => cmd.toJSON());
    if (!(0, import_node_util.isDeepStrictEqual)(commandsJson, this.lastCommandsJson)) {
      this.adapter.log.debug("Commands needs to be updated");
      for (const [, guild] of this.adapter.client.guilds.cache) {
        try {
          if (this.adapter.config.commandsGlobal) {
            await this.removeGuildCommands(guild);
          } else {
            await this.rest.put(import_v10.Routes.applicationGuildCommands(this.adapter.client.user.id, guild.id), { body: commandsJson });
            this.adapter.log.info(`Registered commands for server ${guild.name} (id:${guild.id}) (get: ${numGet}, set: ${numSet}, custom: ${this.customCommands.size})`);
          }
        } catch (err) {
          if (err instanceof import_discord.DiscordAPIError && err.message === "Missing Access") {
            this.adapter.log.warn(`Error registering commands for server ${guild.name} (id:${guild.id}). Seams like the bot is missing the 'applications.commands' scope on the server. ${err}`);
          } else {
            this.adapter.log.warn(`Error registering commands for server ${guild.name} (id:${guild.id}): ${err}`);
          }
        }
      }
      try {
        if (this.adapter.config.commandsGlobal) {
          await this.rest.put(import_v10.Routes.applicationCommands(this.adapter.client.user.id), { body: commandsJson });
          this.adapter.log.info(`Registered global commands (get: ${numGet}, set: ${numSet}, custom: ${this.customCommands.size})`);
        } else {
          await this.removeGlobalCommands();
        }
      } catch (err) {
        if (err instanceof import_discord.DiscordAPIError && err.message === "Missing Access") {
          this.adapter.log.warn(`Error registering global commands. Seams like the bot is missing the 'applications.commands' scope on the server. ${err}`);
        } else {
          this.adapter.log.warn(`Error registering global commands: ${err}`);
        }
      }
      this.lastCommandsJson = commandsJson;
    } else {
      this.adapter.log.debug("Commands seams to be up to date");
    }
    this.registerCommandsDone = true;
  }
  async removeGlobalCommands() {
    var _a, _b;
    if (!((_a = this.adapter.client) == null ? void 0 : _a.user)) {
      throw new Error("Discord client not available");
    }
    try {
      const globalCommands = await ((_b = this.adapter.client.application) == null ? void 0 : _b.commands.fetch());
      if (this.adapter.unloaded)
        return;
      if (globalCommands && globalCommands.size > 0) {
        this.adapter.log.debug(`Currently ${globalCommands.size} global commands registered. Removing them...`);
        await this.rest.put(import_v10.Routes.applicationCommands(this.adapter.client.user.id), { body: [] });
        this.adapter.log.info(`Removed global commands cause commands they are not used anymore.`);
      }
    } catch (err) {
      if (err instanceof import_discord.DiscordAPIError && err.message === "Missing Access") {
        this.adapter.log.warn(`Error while removing registered global commands. Seams like the bot is missing the 'applications.commands' scope on the server. ${err}`);
      } else {
        this.adapter.log.warn(`Error while removing registered global commands: ${err}`);
      }
    }
  }
  async removeGuildCommands(guild) {
    var _a;
    if (!((_a = this.adapter.client) == null ? void 0 : _a.user)) {
      throw new Error("Discord client not available");
    }
    try {
      const guildCommands = await guild.commands.fetch();
      if (this.adapter.unloaded)
        return;
      if (guildCommands.size > 0) {
        this.adapter.log.debug(`Currently ${guildCommands.size} commands registered for server ${guild.name}. Removing them...`);
        await this.rest.put(import_v10.Routes.applicationGuildCommands(this.adapter.client.user.id, guild.id), { body: [] });
        this.adapter.log.info(`Removed commands for server ${guild.name} cause commands they are not used anymore.`);
      }
    } catch (err) {
      if (err instanceof import_discord.DiscordAPIError && err.message === "Missing Access") {
        this.adapter.log.warn(`Error while removing registered commands for server ${guild.name} (id:${guild.id}). Seams like the bot is missing the 'applications.commands' scope on the server. ${err}`);
      } else {
        this.adapter.log.warn(`Error while removing registered commands for server ${guild.name} (id:${guild.id}): ${err}`);
      }
    }
  }
  async setupCustomCommandIobObjects(cmdCfg) {
    var _a;
    const cmdName = cmdCfg.name;
    await this.adapter.extendObjectAsyncCached(`slashCommands.${cmdName}`, {
      type: "channel",
      common: {
        name: cmdCfg.description
      },
      native: {}
    });
    await Promise.all([
      this.adapter.extendObjectAsyncCached(`slashCommands.${cmdName}.json`, {
        type: "state",
        common: {
          name: import_i18n.i18n.getStringOrTranslated("JSON data"),
          role: "json",
          type: "string",
          read: true,
          write: false,
          def: ""
        },
        native: {}
      }),
      this.adapter.extendObjectAsyncCached(`slashCommands.${cmdName}.timestamp`, {
        type: "state",
        common: {
          name: import_i18n.i18n.getStringOrTranslated("Last use timestamp"),
          role: "date",
          type: "number",
          read: true,
          write: false,
          def: 0
        },
        native: {}
      }),
      this.adapter.extendObjectAsyncCached(`slashCommands.${cmdName}.sendReply`, {
        type: "state",
        common: {
          name: import_i18n.i18n.getStringOrTranslated("Send reply"),
          role: "text",
          type: "string",
          read: false,
          write: true,
          def: ""
        },
        native: {}
      }),
      this.adapter.extendObjectAsyncCached(`slashCommands.${cmdName}.interactionId`, {
        type: "state",
        common: {
          name: import_i18n.i18n.getStringOrTranslated("Interaction ID"),
          role: "text",
          type: "string",
          read: true,
          write: false,
          def: ""
        },
        native: {}
      }),
      this.adapter.extendObjectAsyncCached(`slashCommands.${cmdName}.userId`, {
        type: "state",
        common: {
          name: import_i18n.i18n.getStringOrTranslated("User ID"),
          role: "text",
          type: "string",
          read: true,
          write: false,
          def: ""
        },
        native: {}
      }),
      this.adapter.extendObjectAsyncCached(`slashCommands.${cmdName}.userTag`, {
        type: "state",
        common: {
          name: import_i18n.i18n.getStringOrTranslated("User tag"),
          role: "text",
          type: "string",
          read: true,
          write: false,
          def: ""
        },
        native: {}
      }),
      this.adapter.extendObjectAsyncCached(`slashCommands.${cmdName}.serverId`, {
        type: "state",
        common: {
          name: import_i18n.i18n.getStringOrTranslated("Server ID"),
          role: "text",
          type: "string",
          read: true,
          write: false,
          def: ""
        },
        native: {}
      }),
      this.adapter.extendObjectAsyncCached(`slashCommands.${cmdName}.channelId`, {
        type: "state",
        common: {
          name: import_i18n.i18n.getStringOrTranslated("Channel ID"),
          role: "text",
          type: "string",
          read: true,
          write: false,
          def: ""
        },
        native: {}
      })
    ]);
    const proms = [];
    for (const cmdCfgOpt of cmdCfg.options) {
      await this.adapter.extendObjectAsyncCached(`slashCommands.${cmdName}.option-${cmdCfgOpt.name}`, {
        type: "channel",
        common: {
          name: import_i18n.i18n.getStringOrTranslated("Option %s", cmdCfgOpt.description)
        },
        native: {}
      });
      let role;
      let type;
      let def;
      switch (cmdCfgOpt.type) {
        case "number":
          role = "value";
          type = "number";
          def = null;
          break;
        case "boolean":
          role = "indicator";
          type = "boolean";
          def = null;
          break;
        default:
          role = "text";
          type = "string";
          def = "";
      }
      proms.push(this.adapter.extendObjectAsyncCached(`slashCommands.${cmdName}.option-${cmdCfgOpt.name}.value`, {
        type: "state",
        common: {
          name: import_i18n.i18n.getStringOrTranslated("Option %s value", cmdCfgOpt.description),
          role,
          type,
          read: true,
          write: false,
          def
        },
        native: {}
      }));
      if (cmdCfgOpt.type === "string") {
        proms.push(this.adapter.extendObjectAsyncCached(`slashCommands.${cmdName}.option-${cmdCfgOpt.name}.choices`, {
          type: "state",
          common: {
            name: import_i18n.i18n.getStringOrTranslated("Option %s choices", cmdCfgOpt.description),
            role: "json",
            type: "string",
            read: true,
            write: true,
            def: "[]"
          },
          native: {}
        }));
      } else {
        proms.push(this.adapter.delObjectAsyncCached(`slashCommands.${cmdName}.option-${cmdCfgOpt.name}.choices`));
      }
    }
    const objListOptions = await this.adapter.getObjectListAsync({
      startkey: `${this.adapter.namespace}.slashCommands.${cmdName}.option-`,
      endkey: `${this.adapter.namespace}.slashCommands.${cmdName}.option-\u9999`
    });
    const reOptionsName = new RegExp(`^${this.adapter.name}\\.${this.adapter.instance}\\.slashCommands\\.${cmdName}\\.option-([^.]+)$`);
    for (const item of objListOptions.rows) {
      const m = item.id.match(reOptionsName);
      if (m) {
        const oldoptName = m[1];
        if (!cmdCfg.options.find((o) => o.name === oldoptName)) {
          proms.push(this.adapter.delObjectAsyncCached(`slashCommands.${cmdName}.option-${oldoptName}`, { recursive: true }));
          (_a = this.customCommands.get(cmdName)) == null ? void 0 : _a.delete(oldoptName);
        }
      }
    }
    await Promise.all(proms);
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
    if (this.adapter.config.enableRawStates) {
      const interactionJson = interaction.toJSON();
      if (interaction.isCommand()) {
        interactionJson.options = interaction.options.data;
      }
      this.adapter.setState("raw.interactionJson", JSON.stringify(interactionJson, (_key, value) => typeof value === "bigint" ? value.toString() : value), true);
    }
    if (interaction.isCommand()) {
      this.handleCommandInteraction(interaction);
    } else if (interaction.isAutocomplete()) {
      this.handleAutocompleteInteraction(interaction);
    }
  }
  async handleCommandInteraction(interaction) {
    const { commandName, user } = interaction;
    if (!this.registerCommandsDone) {
      this.adapter.log.warn(`Got command ${commandName} but command registration is not done yet.`);
      return;
    }
    this.adapter.log.debug(`Got command ${commandName} ${JSON.stringify(interaction.options.data)}`);
    const authCheckTarget = interaction.member instanceof import_discord.GuildMember ? interaction.member : user;
    if (commandName === this.cmdGetStateName) {
      if (this.adapter.checkUserAuthorization(authCheckTarget, { getStates: true })) {
        await this.handleCmdGetState(interaction);
      } else {
        this.adapter.log.warn(`User ${user.tag} (id:${user.id}) is not authorized to call /${commandName} commands!`);
        await interaction.reply({
          content: import_i18n.i18n.getString("You are not authorized to call this command!"),
          ephemeral: true
        });
      }
    } else if (commandName === this.cmdSetStateName) {
      if (this.adapter.checkUserAuthorization(authCheckTarget, { setStates: true })) {
        await this.handleCmdSetState(interaction);
      } else {
        this.adapter.log.warn(`User ${user.tag} (id:${user.id}) is not authorized to call /${commandName} commands!`);
        await interaction.reply({
          content: import_i18n.i18n.getString("You are not authorized to call this command!"),
          ephemeral: true
        });
      }
    } else if (this.customCommands.has(commandName)) {
      if (this.adapter.checkUserAuthorization(authCheckTarget, { useCustomCommands: true })) {
        await this.handleCmdCustom(interaction);
      } else {
        this.adapter.log.warn(`User ${user.tag} (id:${user.id}) is not authorized to call /${commandName} commands!`);
        await interaction.reply({
          content: import_i18n.i18n.getString("You are not authorized to call this command!"),
          ephemeral: true
        });
      }
    } else {
      this.adapter.log.warn(`Got unknown command ${commandName}!`);
      await interaction.editReply(import_i18n.i18n.getString("Unknown command!"));
    }
  }
  async handleAutocompleteInteraction(interaction) {
    var _a;
    const { commandName, user } = interaction;
    const focused = interaction.options.getFocused(true);
    let focusedValue;
    if (typeof focused.value !== "string") {
      return interaction.respond([]);
    } else {
      focusedValue = focused.value.toLowerCase();
    }
    const authCheckTarget = interaction.member instanceof import_discord.GuildMember ? interaction.member : user;
    let choices;
    if (commandName === this.cmdGetStateName) {
      if (!this.adapter.checkUserAuthorization(authCheckTarget, { getStates: true })) {
        return interaction.respond([]);
      }
      choices = this.cmdGetStateChoices;
    } else if (commandName === this.cmdSetStateName) {
      if (!this.adapter.checkUserAuthorization(authCheckTarget, { setStates: true })) {
        return interaction.respond([]);
      }
      choices = this.cmdSetStateChoices;
    } else if (this.customCommands.has(commandName)) {
      if (!this.adapter.checkUserAuthorization(authCheckTarget, { useCustomCommands: true })) {
        return interaction.respond([]);
      }
      choices = ((_a = this.customCommands.get(commandName)) == null ? void 0 : _a.get(focused.name)) ?? [];
    } else {
      return interaction.respond([]);
    }
    const matchedChoices = choices.filter((choice) => {
      return choice.name.normalize("NFKC").toLowerCase().includes(focusedValue) || choice.value.normalize("NFKC").toLowerCase().includes(focusedValue);
    });
    matchedChoices.splice(25);
    return interaction.respond(matchedChoices);
  }
  async getObjectAndCfgFromAlias(objAlias, interaction) {
    const cfg = this.commandObjectConfig.find((coc) => coc.alias === objAlias);
    if (!cfg) {
      if (interaction.replied) {
        await interaction.editReply({
          content: import_i18n.i18n.getString("Object `%s` not found!", objAlias ?? "")
        });
      } else {
        await interaction.reply({
          content: import_i18n.i18n.getString("Object `%s` not found!", objAlias ?? ""),
          ephemeral: true
        });
      }
      return [null, null];
    }
    const obj = await this.adapter.getForeignObjectAsync(cfg.id);
    if (!obj) {
      if (interaction.replied) {
        await interaction.editReply({
          content: import_i18n.i18n.getString("Object `%s` not found!", cfg.id)
        });
      } else {
        await interaction.reply({
          content: import_i18n.i18n.getString("Object `%s` not found!", cfg.id),
          ephemeral: true
        });
      }
      return [null, null];
    }
    if (obj.type !== "state") {
      if (interaction.replied) {
        await interaction.editReply({
          content: import_i18n.i18n.getString("Object `%s` is not of type state!", cfg.id)
        });
      } else {
        await interaction.reply({
          content: import_i18n.i18n.getString("Object `%s` is not of type state!", cfg.id),
          ephemeral: true
        });
      }
      return [null, null];
    }
    return [obj, cfg];
  }
  async handleCmdGetState(interaction) {
    var _a;
    const objAlias = interaction.options.get("state", true).value;
    const [obj, cfg] = await this.getObjectAndCfgFromAlias(objAlias, interaction);
    if (!obj || !cfg) {
      return;
    }
    const objCustom = (_a = obj.common.custom) == null ? void 0 : _a[this.adapter.namespace];
    if (!(objCustom == null ? void 0 : objCustom.commandsAllowGet)) {
      await interaction.reply({
        content: import_i18n.i18n.getString("Get not allowed for state `%s`!", cfg.id),
        ephemeral: true
      });
      return;
    }
    const state = await this.adapter.getForeignStateAsync(cfg.id);
    if (!state) {
      await interaction.reply({
        content: import_i18n.i18n.getString("State `%s` not found!", cfg.id),
        ephemeral: true
      });
      return;
    }
    if (!interaction.deferred) {
      await interaction.deferReply({ ephemeral: this.adapter.config.commandRepliesEphemeral });
    }
    let val = "";
    let msgOpts = void 0;
    const unit = obj.common.unit ? ` ${obj.common.unit}` : "";
    const ack = objCustom.commandsShowAckFalse && !state.ack ? ` (_${import_i18n.i18n.getString("not acknowledged")}_)` : "";
    if (obj.common.role === "date" && (obj.common.type === "string" && typeof state.val === "string" || obj.common.type === "number" && typeof state.val === "number")) {
      const d = new Date(state.val);
      val = d.toLocaleString(import_i18n.i18n.language, { dateStyle: "full", timeStyle: "long" });
    } else if (obj.common.type === "string" && objCustom.commandsStringSendAsFile && typeof state.val === "string") {
      const b64data = (0, import_utils.getBufferAndNameFromBase64String)(state.val);
      if (b64data) {
        msgOpts = {
          content: `${cfg.name}${ack}:`,
          files: [{
            attachment: b64data.buffer,
            name: b64data.name
          }]
        };
        val = "file:base64";
      } else {
        if (state.val.startsWith("file://")) {
          state.val = state.val.slice(7);
        }
        msgOpts = {
          content: `${cfg.name}${ack}:`,
          files: [{
            attachment: state.val,
            name: (0, import_utils.getBasenameFromFilePathOrUrl)(state.val)
          }]
        };
        val = `file:${state.val}`;
      }
    } else {
      switch (obj.common.type) {
        case "boolean":
          if (state.val) {
            val = objCustom.commandsBooleanValueTrue ?? import_i18n.i18n.getString("true");
          } else {
            val = objCustom.commandsBooleanValueFalse ?? import_i18n.i18n.getString("false");
          }
          break;
        case "number":
          const decimals = objCustom.commandsNumberDecimals ?? 0;
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
    this.adapter.log.debug(`Get command for ${cfg.id} - ${val}${unit}${ack}`);
    try {
      if (msgOpts) {
        await interaction.editReply(msgOpts);
      } else {
        await interaction.editReply(`${cfg.name}: ${val}${unit}${ack}`);
      }
    } catch (err) {
      this.adapter.log.warn(`Error sending interaction reply for /${this.cmdGetStateName} command! ${err}`);
    }
  }
  async handleCmdSetState(interaction) {
    var _a, _b, _c;
    const objAlias = interaction.options.get("state", true).value;
    const [obj, cfg] = await this.getObjectAndCfgFromAlias(objAlias, interaction);
    if (!obj || !cfg) {
      return;
    }
    const objCustom = (_a = obj.common.custom) == null ? void 0 : _a[this.adapter.namespace];
    if (!(objCustom == null ? void 0 : objCustom.commandsAllowSet)) {
      await interaction.reply({
        content: import_i18n.i18n.getString("Set not allowed for state `%s`!", cfg.id),
        ephemeral: true
      });
      return;
    }
    let valueStr = (_b = interaction.options.get("value")) == null ? void 0 : _b.value;
    if (typeof valueStr !== "string") {
      await interaction.reply({
        content: import_i18n.i18n.getString("No value provided!"),
        ephemeral: true
      });
      return;
    }
    if (!interaction.deferred) {
      await interaction.deferReply({ ephemeral: this.adapter.config.commandRepliesEphemeral });
    }
    valueStr = valueStr.trim();
    const unit = obj.common.unit ? ` ${obj.common.unit}` : "";
    let value;
    let valueReply;
    switch (obj.common.type) {
      case "boolean":
        valueStr = valueStr.toLowerCase();
        if (valueStr === ((_c = objCustom.commandsBooleanValueTrue) == null ? void 0 : _c.toLowerCase()) || this.wellKnownbooleanTrueValues.has(valueStr)) {
          value = true;
          valueReply = objCustom.commandsBooleanValueTrue ?? import_i18n.i18n.getString("true");
        } else {
          value = false;
          valueReply = objCustom.commandsBooleanValueFalse ?? import_i18n.i18n.getString("false");
        }
        break;
      case "number":
        if (import_i18n.i18n.isFloatComma) {
          valueStr = valueStr.replace(",", ".");
        }
        value = parseFloat(valueStr);
        if (isNaN(value)) {
          await interaction.editReply(import_i18n.i18n.getString("The given value is not a number!"));
          return;
        }
        valueReply = value.toString();
        if (import_i18n.i18n.isFloatComma) {
          valueReply = valueReply.replace(".", ",");
        }
        if (typeof obj.common.min === "number" && value < obj.common.min) {
          let min = obj.common.min.toString();
          if (import_i18n.i18n.isFloatComma) {
            min = min.replace(".", ",");
          }
          await interaction.editReply(import_i18n.i18n.getString("Value %s is below the allowed minium of %s!", `${valueReply}${unit}`, `${min}${unit}`));
          return;
        }
        if (typeof obj.common.max === "number" && value > obj.common.max) {
          let max = obj.common.max.toString();
          if (import_i18n.i18n.isFloatComma) {
            max = max.replace(".", ",");
          }
          await interaction.editReply(import_i18n.i18n.getString("Value %s is above the allowed maximum of %s!", `${valueReply}${unit}`, `${max}${unit}`));
          return;
        }
        break;
      default:
        value = valueStr;
        valueReply = valueStr;
    }
    this.adapter.log.debug(`Set command for ${cfg.id} - ${value}${unit}`);
    try {
      await this.adapter.setForeignStateAsync(cfg.id, value, !!objCustom.commandsSetWithAck);
    } catch (err) {
      this.adapter.log.warn(`Error while setting state ${cfg.id} to ${value}! ${err}`);
      await interaction.editReply(import_i18n.i18n.getString("Error while setting the state value!"));
      return;
    }
    await interaction.editReply(`${cfg.name}: ${valueReply}${unit}`);
  }
  async handleCmdCustom(interaction) {
    const {
      commandName,
      channelId,
      guildId,
      user,
      options
    } = interaction;
    const cmdCfg = this.adapter.config.customCommands.find((c) => c.name === commandName);
    if (!cmdCfg)
      return;
    if (!interaction.deferred) {
      await interaction.deferReply({ ephemeral: this.adapter.config.commandRepliesEphemeral });
    }
    this.lastInteractions.set(interaction.id, interaction);
    const proms = [];
    const json = {
      interactionId: interaction.id,
      commandName,
      channelId,
      serverId: guildId ?? null,
      user: {
        id: user.id,
        tag: user.tag,
        displayName: interaction.member instanceof import_discord.GuildMember ? interaction.member.displayName : user.username
      },
      timestamp: interaction.createdTimestamp,
      options: {}
    };
    for (const optCfg of cmdCfg.options) {
      const opt = options.data.find((o) => o.name === optCfg.name);
      if (opt) {
        json.options[optCfg.name] = {
          value: opt.value ?? null,
          type: opt.type
        };
        if (opt.user instanceof import_discord.User) {
          json.options[optCfg.name].user = {
            id: opt.user.id,
            tag: opt.user.tag,
            bot: opt.user.bot
          };
        }
        if (opt.member instanceof import_discord.GuildMember) {
          json.options[optCfg.name].member = {
            id: opt.member.id,
            displayName: opt.member.displayName,
            roles: opt.member.roles.cache.map((r) => ({ id: r.id, name: r.name }))
          };
        }
        if (opt.role instanceof import_discord.Role) {
          json.options[optCfg.name].role = {
            id: opt.role.id,
            name: opt.role.name
          };
        }
        if (opt.channel instanceof import_discord.GuildChannel) {
          json.options[optCfg.name].channel = {
            id: opt.channel.id,
            name: opt.channel.name,
            type: import_discord.ChannelType[opt.channel.type],
            lastMessageId: opt.channel.type === import_discord.ChannelType.GuildText || opt.channel.type == import_discord.ChannelType.GuildVoice ? opt.channel.lastMessageId : null
          };
        }
      } else {
        json.options[optCfg.name] = {
          value: null,
          type: null
        };
      }
      proms.push(this.adapter.setStateAsync(`slashCommands.${commandName}.option-${optCfg.name}.value`, json.options[optCfg.name].value, true));
    }
    await Promise.all([
      this.adapter.setStateAsync(`slashCommands.${commandName}.interactionId`, interaction.id, true),
      this.adapter.setStateAsync(`slashCommands.${commandName}.channelId`, channelId, true),
      this.adapter.setStateAsync(`slashCommands.${commandName}.serverId`, guildId ?? null, true),
      this.adapter.setStateAsync(`slashCommands.${commandName}.userId`, user.id, true),
      this.adapter.setStateAsync(`slashCommands.${commandName}.userTag`, user.tag, true),
      this.adapter.setStateAsync(`slashCommands.${commandName}.timestamp`, interaction.createdTimestamp, true),
      this.adapter.setStateAsync(`slashCommands.${commandName}.json`, JSON.stringify(json), true),
      ...proms
    ]);
    const outdatedTs = Date.now() - 15 * 6e4;
    const removedInteractions = this.lastInteractions.sweep((ia) => ia.createdTimestamp < outdatedTs);
    if (removedInteractions > 0) {
      this.adapter.log.debug(`Removed ${removedInteractions} outdated interactions from cache`);
    }
  }
  async sendCmdCustomReply(interactionId, msg) {
    const interaction = this.lastInteractions.get(interactionId);
    if (!interaction) {
      throw new Error(`No current interaction with ID ${interactionId} found for reply!`);
    }
    const { commandName } = interaction;
    const cmdCfg = this.adapter.config.customCommands.find((c) => c.name === commandName);
    if (!cmdCfg) {
      throw new Error(`No configuration for custom slash command ${commandName} of interaction ${interactionId} found for reply!`);
    }
    if (!interaction.isRepliable()) {
      throw new Error(`Interaction ${interactionId} of custom slash command ${commandName} is not repliable!`);
    }
    if (typeof msg === "string") {
      try {
        msg = this.adapter.parseStringifiedMessageOptions(msg);
      } catch (err) {
        throw new Error(`Reply to interaction ${interactionId} of custom slash command ${commandName} is invalid: ${err}`);
      }
    }
    const replyMsg = await interaction.editReply(msg);
    return replyMsg.id;
  }
  logConfiguredCommandObjects() {
    this.adapter.log.info("Configured state objects for discord slash commands:");
    for (const [, cmdObjCfg] of this.commandObjectConfig) {
      this.adapter.log.info(` |- ${cmdObjCfg.id} - alias:${cmdObjCfg.alias}, name:${cmdObjCfg.name}, get:${cmdObjCfg.get}, set:${cmdObjCfg.set}`);
    }
    this.adapter.log.info("---");
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
