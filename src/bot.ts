import { config } from '../config.ts'
import { CommandClient } from '../deps.ts'
import { commands } from './commands/mod.ts'
import { startFetch } from './util/docs.ts'
import { log } from './util/log.ts'

log('Bot', 'Starting bot...')
log('Docs', 'Starting fetch loop...')
// Await this if you want to ensure docs are always here
startFetch()

const client = new CommandClient({
  prefix: ['docs', 'doc'],
  spacesAfterPrefix: true,
  mentionPrefix: true,
  owners: config.owners,
})

client.on('ready', () => {
  log('Login', `Logged in as ${client.user?.tag}`)
})

commands.forEach((Command) => {
  const cmd = new Command()
  client.commands.add(cmd)
  log('Cmd', `Loaded command ${cmd.name}`)
})
log('Cmds', `Loaded ${client.commands.count} commands`)

export { client }
