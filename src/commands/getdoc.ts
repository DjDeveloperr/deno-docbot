import { Command, CommandContext, Embed } from "../../deps.ts";
import { getNode } from "../util/docs.ts";
import { config } from "../../config.ts";

export default class GetDocCommand extends Command {
  name = "Get";
  aliases = ["GetDocs", "GetDoc", "DocInfo", "Info"];
  usage = ["<Name>"];
  examples = ["ClientOptions", "CommandClient"];
  description = "Get Doc info of a Class, etc or their method/property.";

  execute(ctx: CommandContext) {
    const node = getNode(ctx.argString);

    if (!node) {
      return ctx.message.reply("Couldn't find docs for the given name.");
    }

    let embed = new Embed()
      .setTitle(`${node.name} (${node.kind})`)
      .setURL(`https://doc.deno.land/${node.location.filename}`)
      .setColor(0x0dbc6a);

    if (node.jsDoc != null) embed.setDescription(node.jsDoc.doc);

    // Check if the input is a interface
    if (node.interfaceDef !== undefined) {
      const def = node.interfaceDef;
      if (def.extends.length) {
        embed.addField(
          "Extends",
          def.extends.map((type) => type.repr).join(", "),
        );
      }

      if (def.properties.length) {
        const proptxt = def.properties.map(
          (prop) => {
            const propertyName = `**${prop.name}${prop.optional ? "?" : ""}**`;

            const propertyType = prop.tsType?.repr ||
              prop.tsType?.keyword ||
              prop.tsType?.union?.map((t) => t.repr || t.keyword).join(" | ") ||
              prop.tsType?.typeRef?.typeName ||
              "unknown";

            const jsDocs = prop.jsDoc ? "- " + prop.jsDoc.doc : "";

            return `• ${propertyName} ${propertyType} ${jsDocs}`;
          },
        ).join("\n");

        embed = foldEmbed(embed, "Properties", proptxt);
      }
    } // Check if the input is a Class

    if (node.classDef !== undefined) {
      const def = node.classDef;
      if (def.extends) {
        embed.addField("Extends", def.extends);
      }
      if (def.constructors.length) {
        const proptxt = def.constructors[0].params.map((prop) => {
          if (prop.left) {
            const propertyName = "**" + prop.left.name + ":**";
            const propertyType = getLink(prop.left.tsType?.repr) ||
              getLink(prop.left.tsType?.keyword ?? "") ||
              prop.left.tsType?.union?.map(
                (t) => getLink(t.repr) || getLink(t.keyword ?? ""),
              ).join(" | ") ||
              getLink(prop.left.tsType?.typeRef?.typeName ?? "") ||
              "unknown";

            const jsDoc = def.constructors[0].jsDoc != null
              ? " -" + def.constructors[0].jsDoc.doc
              : "";

            return `• ${propertyName} ${propertyType} ${jsDoc}`;
          } else {
            const propertyName = "**" + prop.name + ":**";

            const propertyType = getLink(prop.tsType?.repr) ||
              getLink(prop.tsType?.keyword ?? "") ||
              prop.tsType?.union?.map(
                (t) => getLink(t.repr) || getLink(t.keyword ?? ""),
              ).join(" | ") ||
              getLink(prop.tsType?.typeRef?.typeName ?? "") ||
              "unknown";

            const jsDoc = def.constructors[0].jsDoc != null
              ? " -" + def.constructors[0].jsDoc.doc
              : "";

            return `• ${propertyName} ${propertyType} ${jsDoc}`;
          }
        }).join("\n");

        embed = foldEmbed(
          embed,
          "Constructor",
          def.constructors[0].params.length == 0 ? "Empty" : proptxt,
        );
      }
      if (def.properties.length) {
        const proptxt = def.properties.map(
          (prop) => {
            const propertyName = `**${prop.name}${prop.optional ? "?" : ""}:**`;

            const propertyType = prop.tsType?.repr ||
              prop.tsType?.keyword ||
              prop.tsType?.union
                ?.map((t) => t.repr || t.keyword)
                .join(" | ") ||
              prop.tsType?.typeRef?.typeName ||
              "unknown";

              const jsDoc = prop.jsDoc != null ? ` - ${prop.jsDoc.doc}` : ""

            return `• ${propertyName} ${propertyType} ${jsDoc}`;
          },
        )
          .join("\n");

        embed = foldEmbed(embed, "Properties", proptxt);
      }
    }

    ctx.channel.send(embed);
  }
}

function foldEmbed(embed: Embed, fieldName: string, content: string): Embed {
  if (content.length > 1000) {
    const bulletIndex = content.substring(0, 1000).lastIndexOf("•") - 1;
    embed.addField(fieldName, content.substring(0, bulletIndex));
    return embed;
  } else {
    embed.addField(fieldName, content.substring(0, 1000));
    return embed;
  }
}

function getLink(name: string): string {
  return `[${name}](https://doc.deno.land/${config.module}#${name})`;
}
