import express, { Request, Response } from 'express';
import Task from './Task';

const app = express();
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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
