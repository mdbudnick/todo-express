import Task from '../models/Task'
import { type UUID, randomUUID } from 'crypto'

let GLOBAL_TASK_ID_GENERATOR = 1000
export const ANON_SESSION = randomUUID()

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
tasks.set(ANON_SESSION, createInitialTasks())

export const get = (sessionId: UUID): Task[] => {
  return tasks.get(sessionId) ?? []
}

export const set = (sessionId: UUID, newTasks: Task[]): Task[] => {
  tasks.set(sessionId, newTasks)
  return tasks.get(sessionId) ?? []
}

export const initializeTasks = (sessionId: UUID): void => {
  tasks.set(sessionId, createInitialTasks())
}

export const addNewTask = (sessionId: UUID, newTask: Task): Task => {
  newTask = { ...newTask, id: newTask.id ?? ++GLOBAL_TASK_ID_GENERATOR }
  const existingTasks = get(sessionId)
  existingTasks.push(newTask)
  tasks.set(sessionId, existingTasks)

  return newTask
}
