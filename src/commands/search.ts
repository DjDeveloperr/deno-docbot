import { Command, CommandContext, Embed } from '../../deps.ts'
import { search, NodeEmoji } from '../util/docs.ts'

export default class SearchCommand extends Command {
  name = 'Search'
  usage = ['<Search-String>']
  examples = ['Client', 'MessageReaction']
  aliases = ['Lookup', 'S', 'Look']
  description = 'Search for something in Docs.'

  execute(ctx: CommandContext) {
    const res = search(ctx.argString)
    if (res.length == 0)
      return ctx.message.reply("Couldn't find anything relating to that.")

    const embed = new Embed().setTitle('Search Results').setColor(0x0dbc6a)

    embed.setDescription(
      res
        .map(
          (e) =>
            `${NodeEmoji[e.kind]} **${e.name}** (__${e.kind}__)${
              e.jsDoc ? ` - ${e.jsDoc}` : ''
            }`
        )
        .join('\n')
    )

    ctx.channel.send(embed)
  }
}
