import {
  ApplicationCommandInteraction,
  autocomplete,
  AutocompleteInteraction,
  Client,
  Embed,
  event,
  InteractionResponseType as RT,
  slash,
  SlashCommandOptionType as Type,
} from "https://code.harmony.rocks/v2.5.1";
import { config } from "../config.ts";
import {
  EXPANDED_NAMES,
  getNode,
  NodeClassDef,
  NodeEmoji,
  NodeMethodDef,
  NodeProperty,
  searchNodes,
  toStringRepr,
} from "../util/docs.ts";
import { log } from "../util/log.ts";

export class DocBot extends Client {
  constructor() {
    super({
      token: config.token,
      intents: [],
    });
  }

  @event()
  async ready() {
    log("Bot", "Connected!");

    const existingCommands = await this.interactions.commands.all();

    if (existingCommands.size !== 1) {
      await this.interactions.commands.bulkEdit(
        [
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
                autocomplete: true,
              },
            ],
          },
        ],
      );
    }
  }

  @slash()
  search(d: ApplicationCommandInteraction) {
    const query = d.option<string>("query").replaceAll(" ", "");
    const results = searchNodes(query);
    if (!results.length) {
      return d.respond(this.queryNotFound);
    }

    const responseText = results.map((e) =>
      `• ${NodeEmoji[e.kind]} **${e.name}** (${e.kind})`
    ).join("\n");

    d.respond({
      embeds: [
        new Embed()
          .setTitle("Search Results")
          .setColor("#758ADC")
          .setDescription(responseText),
      ],
    });
  }

  @autocomplete("doc", "name")
  name(d: AutocompleteInteraction) {
    const results = searchNodes(d.focusedOption.value);

    return d.autocomplete(
      results.map((row) => ({
        name: `${row.name} (${row.kind})`,
        value: row.name,
      })),
    );
  }

  @slash()
  doc(d: ApplicationCommandInteraction) {
    let name = d.option<string>("name").replaceAll(" ", "");
    if (name.includes("#") && name.split("#")[1].length > 0) {
      const splitedName = name.split("#");
      name = splitedName[0];
      const node = EXPANDED_NAMES.find(
        (e) =>
          e.name.toLowerCase() == name.toLowerCase() &&
          e.prop.toLowerCase() == splitedName[1]?.toLowerCase(),
      );

      if (!node) return d.respond(this.docNotFound);

      const embed = new Embed()
        .setColor("#758ADC")
        .setTitle(
          `Docs - ${node.n} (${node.isProperty ? "property" : "method"})`,
        );

      const mainNode = getNode(node.name)!;

      const mainNodeDef = mainNode.kind == "class"
        ? mainNode.classDef!
        : mainNode.interfaceDef!;

      const props = node.isProperty
        ? mainNodeDef.properties.filter((e) => e.name == node.prop)
        : mainNodeDef.methods.filter((e) => e.name == node.prop);

      if (!props || !props.length) return d.respond(this.docNotFound);

      props.forEach((prop: NodeMethodDef | NodeProperty, i: number) => {
        if (prop && prop.jsDoc?.doc) embed.setDescription(prop.jsDoc.doc);

        if (node.isProperty) {
          embed.addField(
            "Type",
            "`" + toStringRepr((prop as NodeProperty).tsType!) + "`",
          );

          embed.addField(
            "Readonly",
            boolToString((prop as NodeProperty).readonly),
            true,
          );

          embed.addField("Optional", boolToString(prop.optional), true);
          embed.addField("Static", boolToString(prop.isStatic), true);
        } else {
          const def = (prop as NodeMethodDef).functionDef;
          const etx = props.length > 1 ? ` #${i + 1}` : "";
          if (def.params.length) {
            const paramsText = def.params.map((e) => {
              return `• \`${e.name}:${e.optional ? "?" : ""} ${
                toStringRepr(e.tsType)
              }\``;
            }).join("\n");
            embed.addField("Parameters" + etx, paramsText);
          } else embed.addField("Parameters" + etx, "None");

          embed.addField(
            "Returns" + etx,
            "`" + toStringRepr(def.returnType) + "`",
            true,
          );

          embed.addField(
            "Generator" + etx,
            boolToString(def.isGenerator),
            true,
          );

          embed.addField("Async" + etx, boolToString(def.isAsync), true);
          embed.addField("Static" + etx, boolToString(prop.isStatic), true);
        }
      });

      d.respond({
        embeds: [embed],
      });
    } else {
      const node = getNode(name);
      if (!node) {
        return d.respond(this.docNotFound);
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
              : def.extends.map(toStringRepr).join(", "),
          );
        }

        const implementsDef = (def as NodeClassDef).implements;

        if (implementsDef.length) {
          embed.addField("Implements", implementsDef.join(", "));
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

  get queryNotFound() {
    return {
      ephemeral: true,
      content: "Could not find anything matching query.",
    };
  }

  get docNotFound() {
    return {
      ephemeral: true,
      content: "Could not find documentation for given name.",
      type: RT.CHANNEL_MESSAGE_WITH_SOURCE,
    };
  }
}

function boolToString(val: boolean): string {
  return val ? "Yes" : "No";
}
