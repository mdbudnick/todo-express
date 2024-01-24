interface Task {
  id: string | number
  title: string
  description: string
  completed: boolean
}

export const equalTasks = (task1: Task, task2: Task): boolean => {
  return (
    task1.id === task2.id &&
    task1.title === task2.title &&
    task1.description === task2.description &&
    task1.completed === task2.completed
  )
}

export default Task
