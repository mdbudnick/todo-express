import express, { Request, Response } from 'express'
import bodyParser from 'body-parser'
import Task, { equalTasks } from './Task'

const app = express()
app.use(bodyParser.json())

const tasks: Task[] = []

app.get('/', (req: Request, res: Response) => {
  res.redirect('/tasks')
})

app.get('/tasks', (req: Request & { page?: number }, res: Response) => {
  const pageSize = 200
  const startIndex = (req.page ?? 1 - 1) * pageSize
  const endIndex = startIndex + pageSize

  const paginatedTasks = tasks.slice(startIndex, endIndex)

  res.json({
    totalTasks: tasks.length,
    currentPage: req.page,
    pageSize,
    tasks: paginatedTasks,
  })
})

const parseTaskId = (id: string): string | number => {
  const numericId = parseInt(id, 10)
  return isNaN(numericId) ? id : numericId
}

app.get('/tasks/:id', (req: Request, res: Response) => {
  const taskId = parseTaskId(req.params.id)

  const task = tasks.find((t) => t.id === taskId)
  if (!task) {
    res.status(404).json({ error: `Task ${req.params.id} not found` })
  } else {
    res.status(200).json(task)
  }
})

let GLOBAL_TASK_ID_INCREMENTER = 1000
app.post('/tasks', (req: Request, res: Response) => {
  const { id, title, description, completed }: Task = req.body
  if (!title) {
    res.status(400).json({ error: 'Invalid Task; title required' })
    return
  }
  if (id || id === 0) {
    const existingTaskIndex = tasks.findIndex((t) => t.id === id)

    if (existingTaskIndex !== -1) {
      res.status(409).json({ error: `Task ${id} already exists` })
      return
    }
  }

  const newTask: Task = {
    id: id ?? ++GLOBAL_TASK_ID_INCREMENTER,
    title,
    description: description ?? '',
    completed: completed ?? false,
  }
  tasks.push(newTask)

  res.status(201).json(newTask)
})

app.put('/tasks/:id', (req: Request, res: Response) => {
  const taskId = parseTaskId(req.params.id)

  const existingTaskIndex = tasks.findIndex((t) => t.id === taskId)

  if (existingTaskIndex === -1) {
    res.status(404).json({ error: `Task ${taskId} not found` })
    return
  }

  const { id, title, description, completed }: Task = req.body

  if (id && id !== taskId) {
    res.status(405).json({ error: 'Unable to modify Task id' })
    return
  }
  if (!title) {
    res.status(400).json({ error: 'Invalid update; title required' })
    return
  }
  if (completed == undefined) {
    res.status(400).json({ error: 'Invalid update; completed required' })
    return
  }
  if (typeof completed !== 'boolean') {
    res
      .status(400)
      .json({ error: 'Invalid update; completed must be a boolean' })
    return
  }

  const updatedTask: Task = {
    id: taskId,
    title,
    description: description ?? '',
    completed,
  }

  if (equalTasks(tasks[existingTaskIndex], updatedTask)) {
    res.status(304).json(updatedTask)
    return
  }

  tasks[existingTaskIndex] = updatedTask

  res.json(updatedTask)
})

app.delete('/tasks/:id', (req: Request, res: Response) => {
  const id = parseTaskId(req.params.id)

  const existingTaskIndex = tasks.findIndex((t) => t.id === id)

  if (existingTaskIndex === -1) {
    res.status(404).json({ error: `Task ${id} not found` })
  } else {
    const deletedTask = tasks.splice(existingTaskIndex, 1)[0]
    res.json(deletedTask)
  }
})

export default app
