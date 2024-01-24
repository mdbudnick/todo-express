import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import Task from './Task';

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

app.get('/tasks/:id', (req: Request, res: Response) => {
    const numericId = parseInt(req.params.id, 10);
    const taskId = isNaN(numericId) ? req.params.id : numericId;

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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
