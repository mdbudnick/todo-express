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

type ValidationResult = { valid: boolean; message: string; field?: string; type?: string };

const validateTask = (task: Task): ValidationResult => {
  const expectedTypes: Record<string, string[]> = {
    id: ['string', 'number'],
    title: ['string'],
    description: ['string'],
    completed: ['boolean'],
  };

  for (const field in task) {
    if (!(field in expectedTypes)) {
      return { valid: false, message: `Unexpected field ${field}` };
    }

    const expectedType = expectedTypes[field];
    const actualType = typeof task[field as keyof Task]

    if (!expectedType.includes(actualType)) {
      return { valid: false, message: "Invalid type", field, type: expectedType.join(' or ') };
    }
  }

  return { valid: true, message: "Valid Task" };
};

export default Task
