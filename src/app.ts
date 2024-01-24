import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import Task, { equalTasks } from './Task';

const app = express();
app.use(bodyParser.json());
const port = 3000;

const tasks: Task[] = [];

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.get('/tasks', (req: Request, res: Response) => {
    res.json(tasks);
});

const parseTaskId = (id: string): string | number => {
    const numericId = parseInt(id, 10);
    return isNaN(numericId) ? id : numericId;
}

app.get('/tasks/:id', (req: Request, res: Response) => {
    const taskId =  parseTaskId(req.params.id);

    const task = tasks.find((t) => t.id === taskId);

    if (!task) {
      res.status(404).json({ error: `Task ${req.params.id} not found` });
    } else {
      res.status(200).json(task);
    }
});

let taskId = 1000;
app.post('/tasks', (req: Request, res: Response) => {
    const { id, title, description, completed }: Task = req.body;
  
    if (!title) {
      res.status(400).json({ error: 'Invalid Task; title required' });
      return;
    }
  
    const newTask: Task = {
      id: id ?? taskId++,
      title,
      description: description ?? "",
      completed: completed ?? false,
    };
  
    tasks.push(newTask);
  
    res.status(201).json(newTask);
});

app.put('/tasks/:id', (req: Request, res: Response) => {
    const id = parseTaskId(req.params.id);

    const existingTaskIndex = tasks.findIndex((t) => t.id === id);

    if (existingTaskIndex === -1) {
        res.status(404).json({ error: `Task ${id} not found` });
        return;
    }

    const { title, description, completed }: Task = req.body;

    const updatedTask: Task = {
        id,
        title,
        description,
        completed,
    };

    if (equalTasks(tasks[existingTaskIndex], updatedTask)) {
        res.status(304).json(updatedTask);
        return;
    }

    tasks[existingTaskIndex] = updatedTask;

    res.json(updatedTask);
});

app.delete('/tasks/:id', (req: Request, res: Response) => {
    const id = parseTaskId(req.params.id);
  
    const existingTaskIndex = tasks.findIndex((t) => t.id === id);
  
    if (existingTaskIndex === -1) {
      res.status(404).json({ error: `Task ${id} not found` });
    } else {
      const deletedTask = tasks.splice(existingTaskIndex, 1)[0];
      res.json(deletedTask);
    }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
