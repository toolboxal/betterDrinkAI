import { httpRouter } from 'convex/server'
import { authComponent, createAuth } from './auth'
import { aiHandler } from './aiHandler'

const http = httpRouter()

authComponent.registerRoutes(http, createAuth)

http.route({
  path: '/ai/drink-recognition',
  method: 'POST',
  handler: aiHandler,
})

export default http
