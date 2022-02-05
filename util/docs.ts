// deno-lint-ignore-file no-explicit-any
import { config } from "../config.ts";
import { log } from "./log.ts";

export type NodeType =
  | "class"
  | "interface"
  | "typeAlias"
  | "import"
  | "enum"
  | "method"
  | "function"
  | "identifier";

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
};

export const NodeEmojiURL: {
  [name: string]: string;
} = {
  class:
    "https://canary.discord.com/assets/3e0ee2fd29177284491b8fb543bb4bdb.svg",
  interface:
    "https://canary.discord.com/assets/4606ee2759d6aae4410c034fb94a8395.svg",
  typeAlias:
    "https://canary.discord.com/assets/6c0a0b4df6f599f65e40ad372047d782.svg",
  import:
    "https://canary.discord.com/assets/4606ee2759d6aae4410c034fb94a8395.svg",
  enum:
    "https://canary.discord.com/assets/0df8cc6898cdb812709a4672f137b62d.svg",
  method:
    "https://canary.discord.com/assets/3ae4af803746f6882a684a5a48dc29ff.svg",
  function:
    "https://canary.discord.com/assets/197cdfb70e6835c81cbb1af86ab7e01e.svg",
  identifier:
    "https://canary.discord.com/assets/1c196447e01b16cdb2d0eeea39c3c145.svg",
};

export interface NodeLocation {
  line: number;
  col: number;
  filename: string;
}

export interface TsTypeRef {
  typeParams: any;
  typeName: string;
}

export interface TsType {
  repr: string;
  kind: string;
  typeRef?: TsTypeRef;
  keyword?: string;
  array?: TsType;
  union: TsType[];
}

export interface NodeParam {
  kind: NodeType;
  name: string;
  optional: boolean;
  tsType: TsType;
  left?: NodeParam;
  right?: string;
}

export interface NodeClassConstructorDef {
  jsDoc: { doc: string } | null;
  accessibility: any;
  name: string;
  params: NodeParam[];
  location: NodeLocation;
}

export interface NodeProperty {
  jsDoc: { doc: string } | null;
  tsType?: TsType;
  readonly: boolean;
  accessibility: string | null;
  optional: boolean;
  isAbstract: boolean;
  isStatic: boolean;
  name: string;
  location: NodeLocation;
}

export interface NodeClassDef {
  isAbstract: boolean;
  constructors: NodeClassConstructorDef[];
  properties: NodeProperty[];
  methods: NodeMethodDef[];
  //extends: TsType | null
  extends: string | null;
  indexSignatures: any[];
  implements: string[];
  typeParams: NodeParam[];
  superTypeParams: NodeParam[];
}

export interface NodeMethodDef {
  jsDoc: { doc: string } | null;
  accessibility: string | null;
  optional: boolean;
  isAbstract: boolean;
  isStatic: boolean;
  name: string;
  kind: string;
  functionDef: NodeFunctionDef
  location: NodeLocation
}

export interface NodeFunctionDef {
  params: NodeParam[];
  isAsync: boolean;
  isGenerator: boolean;
  returnType: TsType;
  typeParams: NodeParam[];
}

export interface NodeTypeAliasDef {
  tsType: TsType;
  typeParams: NodeParam[];
}

export interface NodeImportDef {
  src: string;
  imported: string;
}

export interface NodeEnumMember {
  jsDoc: {doc: string} | null
  name: string;
}

export interface NodeEnumDef {
  members: NodeEnumMember[];
}

export interface NodeInterfaceDef {
  extends: TsType[];
  methods: NodeMethodDef[];
  properties: NodeProperty[];
  callSignatures: any[];
  indexSignatures: any[];
  typeParams: NodeParam[];
}

export interface DocNode {
  kind: NodeType;
  name: string;
  jsDoc: { doc: string } | null;
  location: NodeLocation;
  classDef?: NodeClassDef;
  interfaceDef?: NodeInterfaceDef;
  functionDef?: NodeFunctionDef;
  typeAliasDef?: NodeTypeAliasDef;
  importDef?: NodeImportDef;
  enumDef?: NodeEnumDef;
}

export const read = (): DocNode[] => {
  try {
    const text = Deno.readTextFileSync(Deno.cwd() + "/doc.json");
    return JSON.parse(text).filter((e: any) => e.kind !== "import");
  } catch (_e) {
    return [];
  }
};

export const getNode = (name: string) => {
  const nodes = read();
  return nodes.find((node) => node.name.toLowerCase() == name.toLowerCase());
};

export function searchNodes(
  query: string,
  max = 15,
): Array<{ name: string; kind: string }> {
  if (query.includes("#")) {
    const res: Array<{ name: string; kind: string }> = [];
    EXPANDED_NAMES.filter((e) =>
      e.n.toLowerCase().includes(query.toLowerCase())
    )
      .filter((_, i) => i < max)
      .forEach((e) => {
        res.push({ name: e.n, kind: e.isProperty ? "property" : "method" });
      });
    return res;
  }
  return read().filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
    .filter((_, i) => i < max);
}

export const search = (name: string) => {
  const nodes = read();
  return nodes.filter((node) =>
    node.name.toLowerCase().includes(name.toLowerCase())
  );
};

export const fetchDoc = async () => {
  const res = await fetch(
    "https://docpi.deno.dev/?entrypoint=" + config.module,
  ).then((res) => res.json());

  await Deno.writeTextFile(Deno.cwd() + "/doc.json", JSON.stringify(res));
  log("Docs", `Fetched docs`);
  return res;
};

export const startFetch = () => {
  return setInterval(async () => {
    try {
      await fetchDoc();
      // deno-lint-ignore no-empty
    } catch (_e) {}
  }, 1000 * 60 * 30);
};

export const EXPANDED_NAMES: Array<{
  name: string;
  prop: string;
  isProperty: boolean;
  n: string;
}> = [];

read().forEach((doc) => {
  let def;
  switch (doc.kind) {
    case "class":
      def = doc.classDef;
      break;
    case "interface":
      def = doc.interfaceDef;
      break;
    default:
      return;
  }

  if (!def) return;

  if (def.properties && def.properties.length) {
    def.properties.forEach(prop => {
      EXPANDED_NAMES.push({
        name: doc.name,
        prop: prop.name,
        isProperty: true,
        n: `${doc.name}#${prop.name}`,
      });
    });
  }

  if (def.methods && def.methods.length) {
    def.methods.forEach(method => {
      EXPANDED_NAMES.push({
        name: doc.name,
        prop: method.name,
        isProperty: false,
        n: `${doc.name}#${method.name}`,
      });
    });
  }
});

export function toStringRepr(type: TsType): string {
  if (type.kind == "keyword") return type.keyword!;
  else if (type.kind == "array") {
    const def = type.array!;
    if (def.kind == "typeRef") return `${def.repr}[]`;
    else return "Array";
  } else if (type.kind == "typeRef") {
    const ref = type.typeRef;
    return `${type.repr}${
      ref!.typeParams?.length ? `<${ref!.typeParams.map(toStringRepr)}>` : ""
    }`;
  } else if (type.kind == "union") {
    return type.union.map(toStringRepr).join(" | ");
  } else return `${type.repr ?? "unknown"}`;
}