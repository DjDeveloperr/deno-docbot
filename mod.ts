import { config } from './config.ts'
import { client } from './src/bot.ts'
import { GatewayIntents } from './deps.ts'

client.connect(config.token, [
  GatewayIntents.GUILDS,
  GatewayIntents.GUILD_MESSAGES,
  GatewayIntents.DIRECT_MESSAGES,
])
