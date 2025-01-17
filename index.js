const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, Collection, IntentsBitField } = require('discord.js');
const myIntents = new IntentsBitField();
myIntents.add(IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.MessageContent, IntentsBitField.Flags.GuildMessages);
const bot = new Client({
  intents: [
      myIntents
  ]
});
const fs = require("fs");
const moment = require("moment");

var settings = './settingsConfig/settings.json';
var file = require(settings)
var TOKEN = file.TOKEN
var  rest = new REST({ version: '9' }).setToken(TOKEN);

const log = (msg) => {
  console.log(`[${moment().format("YYYY-MM-DD HH:mm:ss")}] ${msg}`);
};

bot.commands = new Collection();
bot.aliases = new Collection();
fs.readdir("./cmd/", (err, files) => {
  if (err) console.error(err);
  log(`Loading a total of ${files.length} commands.`);
  files.forEach(f => {
    let props = require(`./cmd/${f}`);
    log(`Loading Command: ${props.help.name}`);
    bot.commands.set(props.help.name, props);
    props.conf.aliases.forEach(alias => {
      bot.aliases.set(alias, props.help.name);
    });
  });
});

bot.on("guildMemberAdd", function(member) {
  member.roles.add(member.guild.roles.cache.find(role => role.name === "Members")).then(() => {
  })
});

bot.on("messageCreate", msg => {

  var prefix = (file.prefix[msg.guild.id] == undefined) ? file.prefix["default"] : file.prefix[msg.guild.id];

  if (msg.author.bot) return;
  if (!msg.content.startsWith(prefix)) return;
  if (msg.channel.type == "dm") return;

  let command = msg.content.split(" ")[0].slice(prefix.length);
  let params = msg.content.split(" ").slice(1);
  let perms = bot.elevation(msg);
  let cmd;

  if (bot.commands.has(command)) {
    cmd = bot.commands.get(command);
  } else if (bot.aliases.has(command)) {
    cmd = bot.commands.get(bot.aliases.get(command));
  }
  if (cmd) {
    if (perms < cmd.conf.permLevel) return msg.channel.send("oops looks like you dont have the right permission level :(");
    cmd.run(bot, msg, params, perms, prefix);
  }
});

bot.on("ready", () => {
  log(`Ready to serve ${bot.users.cache.size} users, in ${bot.channels.cache.size} channels of ${bot.guilds.cache.size} servers.`);
});

bot.on("error", console.error);
bot.on("warn", console.warn);

bot.login(TOKEN);

bot.on('disconnect', function(erMsg, code) {
  console.log('----- Bot disconnected from Discord with code', code, 'for reason:', erMsg, '-----');
  bot.connect(TOKEN);
});

bot.reload = function (command) {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(`./cmd/${command}`)];
      let cmd = require(`./cmd/${command}`);
      bot.commands.delete(command);
      bot.aliases.forEach((cmd, alias) => {
        if (cmd === command) bot.aliases.delete(alias);
      });

      bot.commands.set(command, cmd);
      cmd.conf.aliases.forEach(alias => {
        bot.aliases.set(alias, cmd.help.name);
      });
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};

bot.elevation = function (msg) {
  /* This function should resolve to an ELEVATION level which
     is then sent to the command handler for verification*/
  let permlvl = 0;

  let mod_role = msg.guild.roles.cache.find(role => role.name === "Members");
  if (mod_role && msg.member.roles.has(mod_role.id)) permlvl = 2;

  let admin_role = msg.guild.roles.cache.find(role => role.name === "Higher-up Members");
  if (admin_role && msg.member.roles.has(admin_role.id)) permlvl = 3;

  if (msg.author.id === "103509994074312704") permlvl = 4;
  return permlvl;
};
