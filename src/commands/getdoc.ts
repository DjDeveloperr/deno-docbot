import { Command, CommandContext, Embed } from "../../deps.ts";
import { getNode, NodeParam, NodeProperty } from "../util/docs.ts";
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
        const proptxt = def.properties.map(getPropertyTxt).join("\n");

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

            const propertyType = getLink(getType(prop.left));

            const jsDoc = def.constructors[0].jsDoc != null
              ? " -" + def.constructors[0].jsDoc.doc
              : "";

            return `• ${propertyName} ${propertyType} ${jsDoc}`;
          } else {
            const propertyName = "**" + prop.name + ":**";

            const propertyType = getLink(getType(prop));

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
        const proptxt = def.properties.map(getPropertyTxt).join("\n");
        embed = foldEmbed(embed, "Properties", proptxt);
      }
    }

    if (node.functionDef) {
      const def = node.functionDef;

      const paramsTxt = def.params.map(getPropertyTxt).join("\n");

      embed = foldEmbed(
        embed,
        "Parameters",
        def.params.length === 0 ? "Empty" : paramsTxt,
      );

      const returnsText = getLink(
        def.returnType.repr ||
          def.returnType.keyword ||
          def.returnType.union
            ?.map((type) => type.repr || type.keyword)
            .join(" | ") ||
          def.returnType.typeRef?.typeName ||
          "unknown",
      );

      embed.addField("Returns", returnsText);
      embed.addField("Async?", def.isAsync ? "True" : "False");
      embed.addField("Generator?", def.isGenerator ? "True" : "False");
    }

    if (node.typeAliasDef) {
      const def = node.typeAliasDef;

      const typeTxt = getLink(
        def.tsType.repr ||
          def.tsType.keyword ||
          def.tsType.union
            ?.map((type) => type.repr || type.keyword)
            .join(" | ") ||
          def.tsType.typeRef?.typeName ||
          "unknown",
      );

      embed.addField("TypeAlias for", typeTxt);
    }

    if (node.enumDef) {
      const def = node.enumDef;

      const membersTxt = def.members.join(", ");

      embed.addField(
        "Members",
        def.members.length === 0 ? "Empty" : membersTxt,
      );
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

function getType(node: NodeProperty | NodeProperty | NodeParam): string {
  return node.tsType?.repr ||
    node.tsType?.keyword ||
    node.tsType?.union
      ?.map((type) => type.repr || type.keyword)
      .join(" | ") ||
    node.tsType?.typeRef?.typeName ||
    "unknown";
}

function getPropertyTxt(node: NodeProperty | NodeProperty | NodeParam): string {
  const propertyName = `**${node.name}${node.optional ? "?" : ""}:**`;

  const propertyType = getType(node);

  return `• ${propertyName} ${propertyType} ${
    // deno-lint-ignore no-explicit-any
    (node as any).jsDoc != null ? ` - ${(node as any).jsDoc.doc}` : ""
  }`;
}
