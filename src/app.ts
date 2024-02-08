import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import { randomUUID } from 'crypto'
import cors from 'cors'
import taskRouter from './routes/tasks_v1'
import * as tasks from './shared/tasks'

const DEFAULT_TASKS_API_VERSION = 'v1'

const app = express()
app.use(bodyParser.json())
app.use(cookieParser())
app.use(cors())
app.use(`/${DEFAULT_TASKS_API_VERSION}/tasks`, taskRouter)

app.get('/', (req: Request, res: Response) => {
  res.redirect(`/${DEFAULT_TASKS_API_VERSION}/tasks`)
})

app.get('/session-id', (req: Request, res: Response) => {
  let sessionId = req.cookies?.session
  if (!sessionId) {
    sessionId = randomUUID()
    tasks.initializeTasks(sessionId)
    res.cookie('session', sessionId, { httpOnly: true })
  }

  res.status(200).json(sessionId)
})

export default app
