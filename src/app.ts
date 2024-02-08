import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import Task, { validateTaskFields } from './models/Task'
import { type UUID, randomUUID } from 'crypto'
import cors from 'cors'
import PaginatedTasks from './models/PaginatedTasks'
import * as tasks from './shared/tasks'

const app = express()
app.use(bodyParser.json())
app.use(cookieParser())
app.use(cors())

const API_VERSION = 'v1'

app.get('/', (req: Request, res: Response) => {
  res.redirect(`/${API_VERSION}/tasks`)
})

app.get(
  `/${API_VERSION}/tasks`,
  (req: Request & { page?: number; pageSize?: number }, res: Response) => {
    if (
      (req.pageSize && isNaN(req.pageSize)) ||
      (req.pageSize && req.pageSize < 0)
    ) {
      res.status(400).json({ error: 'Invalid pageSize parameter' })
    }
    const sessionId = (req.cookies.session as UUID) ?? tasks.ANON_SESSION
    const pageSize =
      req.pageSize && !isNaN(req.pageSize) && req.pageSize >= 0
        ? req.pageSize
        : 200
    const page = req.page ?? 1
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const allUserTasks = tasks.get(sessionId)
    const pageTasks = allUserTasks.slice(startIndex, endIndex)
    const total = allUserTasks.length
    const totalPages = Math.ceil(total / pageSize)

    const toReturn: PaginatedTasks = {
      total,
      totalPages,
      pageSize,
      page,
      tasks: pageTasks,
    }

    res.json(toReturn)
  },
)

const parseTaskId = (id: string): string | number => {
  const numericId = parseInt(id, 10)
  return isNaN(numericId) ? id : numericId
}

app.get(`/${API_VERSION}/tasks/:id`, (req: Request, res: Response) => {
  const taskId = parseTaskId(req.params.id)
  const sessionId = getSessionId(req)

  const task = tasks.get(sessionId).find((t) => t.id === taskId)
  if (!task) {
    res.status(404).json({ error: `Task ${req.params.id} not found` })
  } else {
    res.status(200).json(task)
  }
})

app.post(`/${API_VERSION}/tasks`, (req: Request, res: Response) => {
  const sessionId = getSessionId(req)
  const isValidTask = validateTaskFields(req.body)
  if (!isValidTask.valid) {
    res.status(400).json({
      error: `Invalid Task: ${isValidTask.field!} must be ${isValidTask.type!}`,
    })
    return
  }
  const { id, title, description, completed }: Task = req.body
  if (!title) {
    res.status(400).json({ error: 'Invalid Task: title required' })
    return
  }
  if (id || id === 0) {
    const existingTaskIndex = (tasks.get(sessionId) ?? []).findIndex(
      (t) => t.id === id,
    )

    if (existingTaskIndex !== -1) {
      res.status(409).json({ error: `Task ${id} already exists` })
      return
    }
  }

  let newTask: Task = {
    id,
    title,
    description: description ?? '',
    completed: completed ?? false,
  }
  newTask = tasks.addNewTask(sessionId, newTask)

  res.status(201).json(newTask)
})

app.put(`/${API_VERSION}/tasks/:id`, (req: Request, res: Response) => {
  const taskId = parseTaskId(req.params.id)
  const sessionId = getSessionId(req)

  const existingTaskIndex = (tasks.get(sessionId) ?? []).findIndex(
    (t) => t.id === taskId,
  )

  if (existingTaskIndex === -1) {
    res.status(404).json({ error: `Task ${taskId} not found` })
    return
  }

  const isValidTask = validateTaskFields(req.body)
  if (!isValidTask.valid) {
    res.status(400).json({
      error: `Invalid Task: ${isValidTask.field!} must be ${isValidTask.type!}`,
    })
    return
  }

  const { id, title, description, completed }: Task = req.body

  if (id && id !== taskId) {
    res.status(405).json({ error: 'Unable to modify Task id' })
    return
  }
  if (!title) {
    res.status(400).json({ error: 'Invalid Task: title required' })
    return
  }
  if (completed == undefined) {
    res.status(400).json({ error: 'Invalid Task: completed required' })
    return
  }

  const updatedTask: Task = {
    id: taskId,
    title,
    description: description ?? '',
    completed,
  }

  const userTasks = tasks.get(sessionId)
  userTasks![existingTaskIndex] = updatedTask
  tasks.set(sessionId, userTasks!)

  res.json(updatedTask)
})

app.delete(`/${API_VERSION}/tasks/:id`, (req: Request, res: Response) => {
  const id = parseTaskId(req.params.id)
  const sessionId = getSessionId(req)

  const existingTaskIndex = (tasks.get(sessionId) ?? []).findIndex(
    (t) => t.id === id,
  )

  if (existingTaskIndex === -1) {
    res.status(404).json({ error: `Task ${id} not found` })
  } else {
    const userTasks = tasks.get(sessionId)
    userTasks!.splice(existingTaskIndex, 1)[0]
    tasks.set(sessionId, userTasks!)
    res.status(204).json()
  }
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

const getSessionId = (req: Request): UUID => {
  return (req.cookies?.session as UUID) ?? tasks.ANON_SESSION
}

export default app
