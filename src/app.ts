import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import Task, { validateTaskFields } from './models/Task'
import { type UUID, randomUUID } from 'crypto'
import cors from 'cors'
import PaginatedTasks from './models/PaginatedTasks'

const app = express()
app.use(bodyParser.json())
app.use(cookieParser())
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN
      ? process.env.FRONTEND_ORIGIN
      : 'http://localhost:3000',
  }),
)

let GLOBAL_TASK_ID_GENERATOR = 1000
const INITIAL_TASK_TEMPLATE: Task[] = [
  {
    title: 'Create your own task',
    description: 'Create your first task!',
    completed: false,
  },
  {
    title: 'Visit this Website',
    description: 'Check out this website!',
    completed: true,
  },
]
const createInitialTasks = () => {
  const tasks = []
  for (const task of INITIAL_TASK_TEMPLATE) {
    tasks.push({ ...task, id: ++GLOBAL_TASK_ID_GENERATOR })
  }
  return tasks
}

const tasks: Map<UUID, Task[]> = new Map()
// Shared UUID for anonymous (accessed API directly)
const ANON_SESSION = randomUUID()
tasks.set(ANON_SESSION, createInitialTasks())

app.get('/', (req: Request, res: Response) => {
  res.redirect('/tasks')
})

app.get(
  '/tasks',
  (req: Request & { page?: number; pageSize?: number }, res: Response) => {
    if (
      (req.pageSize && isNaN(req.pageSize)) ||
      (req.pageSize && req.pageSize < 0)
    ) {
      res.status(400).json({ error: 'Invalid pageSize parameter' })
    }
    const sessionId = (req.cookies.session as UUID) ?? ANON_SESSION
    const pageSize =
      req.pageSize && !isNaN(req.pageSize) && req.pageSize >= 0
        ? req.pageSize
        : 200
    const page = req.page ?? 1
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const allUserTasks = tasks.get(sessionId) ?? []
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

app.get('/tasks/:id', (req: Request, res: Response) => {
  const taskId = parseTaskId(req.params.id)
  const sessionId = (req.cookies?.session as UUID) ?? ANON_SESSION

  const task = (tasks.get(sessionId) ?? []).find((t) => t.id === taskId)
  if (!task) {
    res.status(404).json({ error: `Task ${req.params.id} not found` })
  } else {
    res.status(200).json(task)
  }
})

app.post('/tasks', (req: Request, res: Response) => {
  const sessionId = (req.cookies?.session as UUID) ?? ANON_SESSION
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

  const newTask: Task = {
    id: id ?? ++GLOBAL_TASK_ID_GENERATOR,
    title,
    description: description ?? '',
    completed: completed ?? false,
  }
  const userTasks: Task[] = tasks.get(sessionId) ?? []
  userTasks.push(newTask)
  tasks.set(sessionId, userTasks)

  res.status(201).json(newTask)
})

app.put('/tasks/:id', (req: Request, res: Response) => {
  const taskId = parseTaskId(req.params.id)
  const sessionId = (req.cookies?.session as UUID) ?? ANON_SESSION

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

app.delete('/tasks/:id', (req: Request, res: Response) => {
  const id = parseTaskId(req.params.id)
  const sessionId = (req.cookies?.session as UUID) ?? ANON_SESSION

  const existingTaskIndex = (tasks.get(sessionId) ?? []).findIndex(
    (t) => t.id === id,
  )

  if (existingTaskIndex === -1) {
    res.status(404).json({ error: `Task ${id} not found` })
  } else {
    const userTasks = tasks.get(sessionId)
    const deletedTask = userTasks!.splice(existingTaskIndex, 1)[0]
    tasks.set(sessionId, userTasks!)
    res.json(deletedTask)
  }
})

app.get('/session-id', (req: Request, res: Response) => {
  const sessionId = (req.cookies?.session as UUID) ?? randomUUID()
  tasks.set(
    sessionId,
    tasks.get(sessionId) ? tasks.get(sessionId)! : createInitialTasks(),
  )
  res.cookie('session', sessionId, { httpOnly: true })
  res.status(200).json(sessionId)
})

export default app
