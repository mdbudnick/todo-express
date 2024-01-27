interface Task {
  id?: string | number
  title: string
  description?: string
  completed?: boolean
}

const expectedTypes: Record<string, string[]> = {
  id: ['string', 'number'],
  title: ['string'],
  description: ['string'],
  completed: ['boolean'],
}

export const equalTasks = (task1: Task, task2: Task): boolean => {
  for (const key in expectedTypes) {
    if (task1[key as keyof Task] !== task2[key as keyof Task]) {
      return false
    }
  }

  return true
}

type ValidationResult = {
  valid: boolean
  message: string
  field?: string
  type?: string
}

export const validateTaskFields = (task: Task): ValidationResult => {
  for (const field in task) {
    const expectedType = expectedTypes[field]
    const actualType = typeof task[field as keyof Task]

    if (actualType !== 'undefined' && !expectedType.includes(actualType)) {
      return {
        valid: false,
        message: 'Invalid type',
        field,
        type: expectedType.join(' or '),
      }
    }
  }

  return { valid: true, message: 'Valid Task' }
}

export default Task
