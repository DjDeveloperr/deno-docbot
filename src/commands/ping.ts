import { Command, CommandContext } from '../../deps.ts'

export default class PingCommand extends Command {
  name = 'Ping'
  aliases = 'Pong'
  description = "Check bot's WS Ping."

  execute(ctx: CommandContext) {
    ctx.message.reply(`Pong! WS Ping: ${ctx.client.ping}ms`, {
      allowedMentions: {
        users: [] as string[],
      },
    })
  }
}
