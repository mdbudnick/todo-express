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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
