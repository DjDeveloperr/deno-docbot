import {
  Client,
  Embed,
  event,
  Interaction,
  InteractionResponseType as RT,
  slash,
  SlashCommandOptionType as Type,
} from "https://code.harmony.rocks/v2.5.1";
import { config } from "../config.ts";
import {
  EXPANDED_NAMES,
  getNode,
  NodeEmoji,
  NodeMethodDef,
  NodeProperty,
  searchNodes,
  toStringRepr,
} from "../util/docs.ts";

export class DocBot extends Client {
  sync = Deno.args.includes("sync");

  constructor() {
    super({
      token: config.token,
      intents: [],
    });
  }

  @event()
  async ready() {
    console.log(`Connected!`);
    // await this.interactions.commands.bulkEdit([]);
    if (this.sync) {
      await this.interactions.commands.bulkEdit(
        [
          {
            name: "search",
            description: "Search for something in Docs.",
            options: [
              {
                name: "query",
                description: "Query to search with.",
                type: Type.STRING,
                required: true,
              },
            ],
          },
          {
            name: "doc",
            description:
              "See documentation for a class/interface/function/method/property/type.",
            options: [
              {
                name: "name",
                description: "Name to see documentation of.",
                type: Type.STRING,
                required: true,
              },
            ],
          },
        ],
      );
    }
  }

  @slash()
  search(d: Interaction) {
    if (!d.isApplicationCommand()) return;
    const query = d.option<string>("query").replaceAll(" ", "");
    const results = searchNodes(query);
    if (!results.length) {
      return d.respond({
        ephemeral: true,
        content: "Could not find anything matching query.",
      });
    }

    d.respond({
      embeds: [
        new Embed()
          .setTitle("Search Results")
          .setColor("#758ADC")
          .setDescription(
            results
              .map((e) => `• ${NodeEmoji[e.kind]} **${e.name}** (${e.kind})`)
              .join("\n"),
          ),
      ],
    });
  }

  @slash()
  doc(d: Interaction) {
    if (!d.isApplicationCommand()) return;
    let name = d.option<string>("name").replaceAll(" ", "");
    if (name.includes("#") && name.split("#")[1].length > 0) {
      const splitedName = name.split("#");
      name = splitedName[0];
      const node = EXPANDED_NAMES.find(
        (e) =>
          e.name.toLowerCase() == name.toLowerCase() &&
          e.prop.toLowerCase() == splitedName[1]?.toLowerCase(),
      );
      if (!node) {
        return d.respond({
          ephemeral: true,
          content: "Could not find documentation for given name.",
          type: RT.CHANNEL_MESSAGE_WITH_SOURCE,
        });
      }

      const embed = new Embed()
        .setColor("#758ADC")
        .setTitle(
          `Docs - ${node.n} (${node.isProperty ? "property" : "method"})`,
        );
      const dnode = getNode(node.name)!;
      const props = node.isProperty
        ? (dnode.kind == "class" ? dnode.classDef! : dnode.interfaceDef!)
          .properties.filter((e) => e.name == node.prop)
        : (dnode.kind == "class" ? dnode.classDef! : dnode.interfaceDef!)
          .methods
          .filter((e) => e.name == node.prop);

      if (!props || !props.length) {
        return d.respond({
          ephemeral: true,
          content: "Could not find documentation for given name.",
          type: RT.CHANNEL_MESSAGE_WITH_SOURCE,
        });
      }

      const len = props.length;
      props.forEach((prop: NodeMethodDef | NodeProperty, i: number) => {
        if (prop && prop.jsDoc?.doc) {
          embed.setDescription(prop.jsDoc.doc);
        }

        if (node.isProperty) {
          embed.addField(
            "Type",
            "`" + toStringRepr((prop as NodeProperty).tsType!) + "`",
          );
          embed.addField(
            "Readonly",
            (prop as NodeProperty).readonly ? "Yes" : "No",
            true,
          );
          embed.addField(
            "Optional",
            (prop as NodeProperty).optional ? "Yes" : "No",
            true,
          );
          embed.addField(
            "Static",
            (prop as NodeProperty).isStatic ? "Yes" : "No",
            true,
          );
        } else {
          const def = (prop as NodeMethodDef).functionDef;
          const etx = len > 1 ? ` #${i + 1}` : "";
          if (def.params.length) {
            embed.addField(
              "Parameters" + etx,
              def.params
                .map(
                  (e) =>
                    `• \`${e.name}:${e.optional ? "?" : ""} ${
                      toStringRepr(e.tsType)
                    }\``,
                )
                .join("\n"),
            );
          } else embed.addField("Parameters" + etx, "None");
          embed.addField(
            "Returns" + etx,
            "`" + toStringRepr(def.returnType) + "`",
            true,
          );
          if (def.isAsync) embed.addField("Async" + etx, "Yes", true);
          if (def.isGenerator) embed.addField("Generator" + etx, "Yes", true);
          if (prop.isStatic) embed.addField("Static" + etx, "Yes", true);
        }
      });

      d.respond({
        embeds: [embed],
      });
    } else {
      const node = getNode(name);
      if (!node) {
        return d.respond({
          ephemeral: true,
          content: "Could not find documentation for given name.",
          type: RT.CHANNEL_MESSAGE_WITH_SOURCE,
        });
      }
      const embed = new Embed()
        .setColor("#758ADC")
        .setTitle(`Docs - ${node.name} (${node.kind})`);

      if (node.jsDoc) embed.setDescription(node.jsDoc.doc);

      if (node.kind == "class" || node.kind == "interface") {
        const def = node.kind == "class" ? node.classDef! : node.interfaceDef!;
        if (def.extends?.length) {
          embed.addField(
            "Extends",
            typeof def.extends === "string"
              ? def.extends
              : def.extends.join(", "),
          );
        }
        // deno-lint-ignore no-explicit-any
        if ((def as any).implements?.length) {
          // deno-lint-ignore no-explicit-any
          embed.addField("Implements", (def as any).implements.join(", "));
        }
        if (def.properties?.length) {
          embed.addField(
            "Properties",
            [...new Set(def.properties)]
              .map((prop) => `\`${prop.name}\``)
              .join(", "),
          );
        }
        if (def.methods?.length) {
          embed.addField(
            "Methods",
            [...new Set(def.methods)]
              .map((prop) => `\`${prop.name}\``)
              .join(", "),
          );
        }
      } else if (node.kind == "typeAlias") {
        const def = node.typeAliasDef!;
        embed.addField("Type", "`" + toStringRepr(def.tsType) + "`");
        if (def.typeParams && def.typeParams.length) {
          embed.addField(
            "Type Parameters",
            def.typeParams.map((e) => "`" + toStringRepr(e.tsType) + "`")
              .join(", "),
          );
        }
      } else if (node.kind == "function") {
        const def = node.functionDef!;
        if (def.params.length) {
          embed.addField(
            "Parameters",
            def.params
              .map((e) =>
                `• \`${e.name}:${e.optional ? "?" : ""} ${
                  toStringRepr(e.tsType)
                }\``
              )
              .join("\n"),
          );
        } else embed.addField("Parameters", "None");
        embed.addField(
          "Returns",
          "`" + toStringRepr(def.returnType) + "`",
          true,
        );
        if (def.isAsync) embed.addField("Async", "Yes", true);
        if (def.isGenerator) embed.addField("Generator", "Yes", true);
      } else if (node.kind == "enum") {
        const def = node.enumDef!;
        embed.addField(
          "Members",
          def.members.length
            ? def.members
              .map((e) =>
                `• \`${e.name}\`${e.jsDoc?.doc ? `: ${e.jsDoc.doc}` : ""}`
              )
              .join("\n")
            : "None",
        );
      } else {
        return d.respond({
          ephemeral: true,
          content: "Could not find documentation for given name.",
          type: RT.CHANNEL_MESSAGE_WITH_SOURCE,
        });
      }

      d.respond({
        embeds: [embed],
      });
    }
  }
}
