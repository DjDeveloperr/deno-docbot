import { config } from '../../config-example.ts'
import { log } from './log.ts'

export type NodeType =
  | 'class'
  | 'interface'
  | 'typeAlias'
  | 'import'
  | 'enum'
  | 'method'
  | 'function'
  | 'identifier'

export const NodeEmoji: {
  [name: string]: string
} = {
  class: '🇨',
  interface: '🇮',
  typeAlias: '🇹',
  import: '🇮',
  enum: '🇪',
  method: '🇲',
  function: '🇫',
  identifier: '🇽',
}

export const NodeEmojiURL: {
  [name: string]: string
} = {
  class:
    'https://canary.discord.com/assets/3e0ee2fd29177284491b8fb543bb4bdb.svg',
  interface:
    'https://canary.discord.com/assets/4606ee2759d6aae4410c034fb94a8395.svg',
  typeAlias:
    'https://canary.discord.com/assets/6c0a0b4df6f599f65e40ad372047d782.svg',
  import:
    'https://canary.discord.com/assets/4606ee2759d6aae4410c034fb94a8395.svg',
  enum:
    'https://canary.discord.com/assets/0df8cc6898cdb812709a4672f137b62d.svg',
  method:
    'https://canary.discord.com/assets/3ae4af803746f6882a684a5a48dc29ff.svg',
  function:
    'https://canary.discord.com/assets/197cdfb70e6835c81cbb1af86ab7e01e.svg',
  identifier:
    'https://canary.discord.com/assets/1c196447e01b16cdb2d0eeea39c3c145.svg',
}

export interface NodeLocation {
  line: number
  col: number
  filename: string
}

export interface TsTypeRef {
  typeParams: any
  typeName: string
}

export interface TsType {
  repr: string
  kind: string
  typeRef?: TsTypeRef
  keyword?: string
  union: TsType[]
}

export interface NodeParam {
  kind: NodeType
  name: string
  optional: boolean
  tsType: TsType
  left?: NodeParam
  right?: string
}

export interface NodeClassConstructorDef {
  jsDoc: string | null
  accessibility: any
  name: string
  params: NodeParam[]
  location: NodeLocation
}

export interface NodeProperty {
  jsDoc: string | null
  tsType?: TsType
  readonly: boolean
  accessibility: string | null
  optional: boolean
  isAbstract: boolean
  isStatic: boolean
  name: string
  location: NodeLocation
}

export interface NodeClassDef {
  isAbstract: boolean
  constructors: NodeClassConstructorDef[]
  properties: NodeProperty[]
  //extends: TsType | null
  extends: string | null
  indexSignatures: any[]
  implements: string[]
  typeParams: NodeParam[]
  superTypeParams: NodeParam[]
}

export interface NodeFunctionDef {
  params: NodeParam[]
  isAsync: boolean
  isGenerator: boolean
  returnType: TsType
  typeParams: NodeParam[]
}

export interface NodeTypeAliasDef {
  tsType: TsType
  typeParams: NodeParam[]
}

export interface NodeImportDef {
  src: string
  imported: string
}

export interface NodeEnumMember {
  name: string
}

export interface NodeEnumDef {
  members: NodeEnumMember[]
}

export interface NodeInterfaceDef {
  extends: TsType[]
  methods: NodeFunctionDef[]
  properties: NodeProperty[]
  callSignatures: any[]
  indexSignatures: any[]
  typeParams: NodeParam[]
}

export interface DocNode {
  kind: NodeType
  name: string
  jsDoc: string | null
  location: NodeLocation
  classDef?: NodeClassDef
  interfaceDef?: NodeInterfaceDef
  functionDef?: NodeFunctionDef
  typeAliasDef?: NodeTypeAliasDef
  importDef?: NodeImportDef
}

export const read = (): DocNode[] => {
  try {
    const text = Deno.readTextFileSync('./doc.json')
    return JSON.parse(text).nodes.filter((e: any) => e.kind !== 'import')
  } catch (e) {
    return []
  }
}

export const getNode = (name: string) => {
  const nodes = read()
  return nodes.find((node) => node.name.toLowerCase() == name.toLowerCase())
}

export const search = (name: string) => {
  const nodes = read()
  return nodes.filter((node) =>
    node.name.toLowerCase().includes(name.toLowerCase())
  )
}

export const fetchDoc = async () => {
  const res = await fetch(
    'https://doc.deno.land/api/docs?entrypoint=' +
      config.module +
      '&force_reload=true'
  ).then((res) => res.json())

  await Deno.writeTextFile('./doc.json', JSON.stringify(res))
  log('Docs', `Fetched docs`)
  return res
}

export const startFetch = async () => {
  // await fetchDoc()

  return setInterval(async () => {
    try {
      fetchDoc()
    } catch (e) {}
  }, 1000 * 60 * 30)
}
