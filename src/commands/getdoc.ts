import { Command, CommandContext, Embed } from '../../deps.ts'
import { getNode, NodeEmoji, NodeEmojiURL } from '../util/docs.ts'

export default class GetDocCommand extends Command {
  name = 'Get'
  aliases = ['GetDocs', 'GetDoc', 'DocInfo', 'Info']
  usage = ['<Name>']
  examples = ['ClientOptions', 'CommandClient']
  description = 'Get Doc info of a Class, etc or their method/property.'

  execute(ctx: CommandContext) {
    const node = getNode(ctx.argString)
    if (!node)
      return ctx.message.reply("Couldn't find docs for the given name.")

    console.log(node)

    const embed = new Embed()
      .setTitle(`${node.name} (${node.kind})`)
      .setURL(node.location.filename)
      .setColor(0x0dbc6a)

    if (node.jsDoc != null) embed.setDescription(node.jsDoc)

    if (node.interfaceDef !== undefined) {
      const def = node.interfaceDef
      if (def.extends.length)
        embed.addField(
          'Extends',
          def.extends.map((e) => (e as any).repr).join(', ')
        )
      if (def.properties.length) {
        console.log(def.properties)
        const proptxt = def.properties
          .map(
            (prop) =>
              `• **${prop.name}${prop.optional ? '?' : ''}:** __${
                prop.tsType?.repr ||
                prop.tsType?.keyword ||
                prop.tsType?.union
                  ?.map((t) => t.repr || t.keyword)
                  .join(' | ') ||
                prop.tsType?.typeRef?.typeName ||
                'unknown'
              }__${prop.jsDoc != null ? ` - ${prop.jsDoc}` : ''}`
          )
          .join('\n')

        const leftover = proptxt.length > 1000
        embed.addField('Properties', proptxt.substring(0, 1000))
        if (leftover) {
          embed.addField('\u200b', proptxt.substring(1000, 2000))
        }
      }
    }

    ctx.channel.send(embed)
  }
}
