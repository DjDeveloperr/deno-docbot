import {
  Client,
  slash,
  event,
  Interaction,
  SlashCommandOptionType as Type,
  InteractionResponseType as RT,
  Embed,
} from "https://code.harmony.rocks/v2.5.1";
import { TOKEN } from "./config.ts";

export const NodeEmoji: {
  [name: string]: string;
} = {
  class: "🇨",
  interface: "🇮",
  typeAlias: "🇹",
  import: "🇮",
  enum: "🇪",
  method: "🇲",
  function: "🇫",
  identifier: "🇽",
  property: "🇵",
};

export const DOCS: any[] = JSON.parse(
  Deno.readTextFileSync("docs.json")
).filter((e: any) => e.kind != "import");

export const EXPANDED_NAMES: Array<{
  name: string;
  prop: string;
  isp: boolean;
  n: string;
}> = [];
DOCS.forEach((doc) => {
  let def;
  if (doc.kind == "class") def = doc.classDef;
  else if (doc.kind == "interface") def = doc.interfaceDef;
  else return;
  if (!def) return;
  let props = def.properties;
  if (props && props.length) {
    props.forEach((prop: any) => {
      EXPANDED_NAMES.push({
        name: doc.name,
        prop: prop.name,
        isp: true,
        n: `${doc.name}#${prop.name}`,
      });
    });
  }
  if (def.methods && def.methods.length) {
    def.methods.forEach((method: any) => {
      EXPANDED_NAMES.push({
        name: doc.name,
        prop: method.name,
        isp: false,
        n: `${doc.name}#${method.name}`,
      });
    });
  }
});

export function getNode(name: string) {
  return DOCS.find((e) => e.name.toLowerCase() == name.toLowerCase());
}

export function searchNodes(
  query: string,
  max = 15
): Array<{ name: string; kind: string }> {
  if (query.includes("#")) {
    let res: Array<{ name: string; kind: string }> = [];
    EXPANDED_NAMES.filter((e) =>
      e.n.toLowerCase().includes(query.toLowerCase())
    )
      .filter((_, i) => i < max)
      .forEach((e) => {
        res.push({ name: e.n, kind: e.isp ? "property" : "method" });
      });
    return res;
  }
  return DOCS.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase())
  ).filter((_, i) => i < max);
}

export function tts(d: any = {}): string {
  if (d.kind == "keyword") return d.keyword;
  else if (d.kind == "array") {
    let def = d.array;
    if (def.kind == "typeRef") return `${def.repr}[]`;
    else return "Array";
  } else if (d.kind == "typeRef") {
    let ref = d.typeRef;
    return `${d.repr}${
      ref.typeParams?.length
        ? `<${ref.typeParams.map((e: any) => tts(e))}>`
        : ""
    }`;
  } else if (d.kind == "union") {
    return d.union.map((e: any) => tts(e)).join(" | ");
  } else return `${d.repr ?? "unknown"}`;
}

export class DocBot extends Client {
  sync = Deno.args.includes("sync");

  constructor() {
    super({
      token: TOKEN,
      intents: [],
    });
  }

  @event() async ready() {
    console.log(`Connected!`);
    // await this.slash.commands.bulkEdit([]);
    if (this.sync)
      await this.slash.commands.bulkEdit(
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

  @slash() search(d: Interaction) {
    const query = d.option<string>("query").replaceAll(" ", "");
    const results = searchNodes(query);
    if (!results.length)
      return d.respond({
        ephemeral: true,
        content: "Could not find anything matching query.",
      });

    d.respond({
      embeds: [
        new Embed()
          .setTitle("Search Results")
          .setColor("#758ADC")
          .setDescription(
            results
              .map((e) => `• ${NodeEmoji[e.kind]} **${e.name}** (${e.kind})`)
              .join("\n")
          ),
      ],
    });
  }

  @slash() doc(d: Interaction) {
    let name = d.option<string>("name").replaceAll(" ", "");
    if (name.includes("#") && name.split("#")[1].length > 0) {
      let spl = name.split("#");
      name = spl[0];
      const node = EXPANDED_NAMES.find(
        (e) =>
          e.name.toLowerCase() == name.toLowerCase() &&
          e.prop.toLowerCase() == spl[1]?.toLowerCase()
      );
      if (!node)
        return d.respond({
          ephemeral: true,
          content: "Could not find documentation for given name.",
          type: RT.CHANNEL_MESSAGE,
        });

      let embed = new Embed()
        .setColor("#758ADC")
        .setTitle(`Docs - ${node.n} (${node.isp ? "property" : "method"})`);
      let dnode = getNode(node.name);
      let props = node.isp
        ? (dnode.kind == "class"
            ? dnode.classDef
            : dnode.interfaceDef
          ).properties.filter((e: any) => e.name == node.prop)
        : (dnode.kind == "class"
            ? dnode.classDef
            : dnode.interfaceDef
          ).methods.filter((e: any) => e.name == node.prop);
      if (!props || !props.length)
        return d.respond({
          ephemeral: true,
          content: "Could not find documentation for given name.",
          type: RT.CHANNEL_MESSAGE,
        });

      const len = props.length;
      props.forEach((prop: any, i: number) => {
        if (prop && prop.jsDoc) {
          embed.setDescription(prop.jsDoc);
        }

        if (node.isp) {
          embed.addField("Type", "`" + tts(prop.tsType) + "`");
          embed.addField("Readonly", prop.readonly ? "Yes" : "No", true);
          embed.addField("Optional", prop.optional ? "Yes" : "No", true);
          embed.addField("Static", prop.static ? "Yes" : "No", true);
        } else {
          let def = prop.functionDef;
          let etx = len > 1 ? ` #${i + 1}` : "";
          if (def.params.length)
            embed.addField(
              "Parameters" + etx,
              def.params
                .map(
                  (e: any) =>
                    `• \`${e.name}:${e.optional ? "?" : ""} ${tts(e.tsType)}\``
                )
                .join("\n")
            );
          else embed.addField("Parameters" + etx, "None");
          embed.addField(
            "Returns" + etx,
            "`" + tts(def.returnType) + "`",
            true
          );
          if (def.isAsync) embed.addField("Async" + etx, "Yes", true);
          if (def.isGenerator) embed.addField("Generator" + etx, "Yes", true);
          if (prop.static) embed.addField("Static" + etx, "Yes", true);
        }
      });

      d.respond({
        embeds: [embed],
      });
    } else {
      const node = getNode(name);
      if (!node)
        return d.respond({
          ephemeral: true,
          content: "Could not find documentation for given name.",
          type: RT.CHANNEL_MESSAGE,
        });
      let embed = new Embed()
        .setColor("#758ADC")
        .setTitle(`Docs - ${node.name} (${node.kind})`);

      if (node.jsDoc) embed.setDescription(node.jsDoc);

      if (node.kind == "class" || node.kind == "interface") {
        let def = node.kind == "class" ? node.classDef : node.interfaceDef;
        if (def.extends?.length) {
          embed.addField(
            "Extends",
            typeof def.extends === "string"
              ? def.extends
              : def.extends.join(", ")
          );
        }
        if (def.implements?.length) {
          embed.addField("Implements", def.implements.join(", "));
        }
        if (def.properties?.length)
          embed.addField(
            "Properties",
            [...new Set(def.properties)]
              .map((prop: any) => `\`${prop.name}\``)
              .join(", ")
          );
        if (def.methods?.length)
          embed.addField(
            "Methods",
            [...new Set(def.methods)]
              .map((prop: any) => `\`${prop.name}\``)
              .join(", ")
          );
      } else if (node.kind == "typeAlias") {
        let def = node.typeAliasDef;
        embed.addField("Type", "`" + tts(def.tsType) + "`");
        if (def.typeParams && def.typeParams.length)
          embed.addField(
            "Type Parameters",
            def.typeParams.map((e: any) => "`" + tts(e) + "`").join(", ")
          );
      } else if (node.kind == "function") {
        let def = node.functionDef;
        if (def.params.length)
          embed.addField(
            "Parameters",
            def.params
              .map(
                (e: any) =>
                  `• \`${e.name}:${e.optional ? "?" : ""} ${tts(e.tsType)}\``
              )
              .join("\n")
          );
        else embed.addField("Parameters", "None");
        embed.addField("Returns", "`" + tts(def.returnType) + "`", true);
        if (def.isAsync) embed.addField("Async", "Yes", true);
        if (def.isGenerator) embed.addField("Generator", "Yes", true);
        if (node.static) embed.addField("Static", "Yes", true);
      } else if (node.kind == "enum") {
        let def = node.enumDef;
        embed.addField(
          "Members",
          def.members.length
            ? def.members
                .map(
                  (e: any) => `• \`${e.name}\`${e.jsDoc ? `: ${e.jsDoc}` : ""}`
                )
                .join("\n")
            : "None"
        );
      } else
        return d.respond({
          ephemeral: true,
          content: "Could not find documentation for given name.",
          type: RT.CHANNEL_MESSAGE,
        });

      d.respond({
        embeds: [embed],
      });
    }
  }
}

if (import.meta.main) {
  const bot = new DocBot();
  bot.connect();
}
