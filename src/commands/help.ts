import { Command, CommandContext, Embed } from '../../deps.ts'

export default class PingCommand extends Command {
  name = 'Help'
  aliases = ['Hlp', 'H']
  usage = ['', '<Command-Name>']
  examples = ['', 'Search']
  description = 'Get list of commands or info of one.'

  execute(ctx: CommandContext) {
    if ((ctx.args ?? []).length === 0) {
      const embed = new Embed()
        .setTitle('Help - Commands')
        .setColor(0x0dbc6a)
        .setThumbnail({
          url:
            'https://cdn.discordapp.com/avatars/783937840752099332/e079627d8256d2c340492e52f1c60318.png',
        })

      ctx.client.commands.list.forEach((cmd) => {
        embed.addField(
          `${ctx.prefix} ${cmd.name}`.trim(),
          cmd.description === undefined ? '\u200b' : cmd.description
        )
      })

      ctx.channel.send(embed)
    } else {
      const cmd = ctx.client.commands.find(ctx.argString)
      if (cmd === undefined)
        return ctx.message.reply(
          `Command could not be found. Try \`${ctx.prefix} help\` for more a list.`
        )

      const embed = new Embed()
        .setTitle(`Command - ${cmd.name}`)
        .setColor(0x0dbc6a)
        .setThumbnail({
          url:
            'https://cdn.discordapp.com/avatars/783937840752099332/e079627d8256d2c340492e52f1c60318.png',
        })
        .setDescription(
          cmd.description === undefined ? 'No description.' : cmd.description
        )

      if (cmd.usage) {
        const usages = [
          ...(typeof cmd.usage === 'string' ? [cmd.usage] : cmd.usage),
        ]

        embed.addField(
          `Usage${usages.length === 1 ? '' : 's'}`,
          usages
            .map((usage) =>
              `${usages.length === 1 ? '' : '• '}\`${ctx.prefix} ${
                cmd?.name
              } ${usage}\``.trim()
            )
            .join('\n')
        )
      }

      if (cmd.examples !== undefined && cmd.examples.length) {
        const examples = [
          ...(typeof cmd.examples === 'string' ? [cmd.examples] : cmd.examples),
        ]

        embed.addField(
          `Example${examples.length === 1 ? '' : 's'}`,
          examples
            .map((example) =>
              `${examples.length === 1 ? '' : '• '}\`${ctx.prefix} ${
                cmd?.name
              } ${example}\``.trim()
            )
            .join('\n')
        )
      }

      ctx.channel.send(embed)
    }
  }
}
