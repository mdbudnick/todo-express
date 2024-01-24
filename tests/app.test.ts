import request from 'supertest'
import app from '../src/app'

afterEach(async () => {
  let tasksResponse = await request(app).get('/tasks')
  for (const task of tasksResponse.body.tasks) {
    await request(app).delete(`/tasks/${task.id}`)
  }
  tasksResponse = await request(app).get('/tasks')
  expect(tasksResponse.body.tasks).toHaveLength(0)
})

describe('GET /', () => {
  it('responds with a redirect to /tasks', async () => {
    const response = await request(app).get('/')
    expect(response.status).toBe(302)
    expect(response.header.location).toBe('/tasks')
    return
  })
})

describe('GET /tasks', () => {
  it('responds with JSON containing tasks', async () => {
    const response = await request(app).get('/tasks')
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('tasks')
    return
  })
})

const newTask = {
  title: 'New Task',
  description: 'Description for the new task',
}

const taskWithId = {
  id: 'id',
  title: 'Some Task',
  description: 'Description for a defined task',
  completed: true,
}

const anotherTaskWithId = {
  id: 'anotherId',
  title: 'Another Task',
  description: 'Description for the third task',
}

describe('POST /tasks', () => {
  it('creates a task without a set id', async () => {
    const postResponse = await request(app).post('/tasks').send(newTask)

    expect(postResponse.status).toBe(201)
    expect(postResponse.body).toHaveProperty('id')
    expect(postResponse.body.title).toBe(newTask.title)
    expect(postResponse.body.description).toBe(newTask.description)
    // Defaults completed to false
    expect(postResponse.body.completed).toBe(false)

    const taskId = postResponse.body.id

    // Check that /tasks returns length of 1
    const tasksResponse = await request(app).get('/tasks')
    expect(tasksResponse.status).toBe(200)
    expect(tasksResponse.body.tasks).toHaveLength(1)

    // Check that /tasks/id for the created task returns the task
    const taskByIdResponse = await request(app).get(`/tasks/${taskId}`)
    expect(taskByIdResponse.status).toBe(200)
    expect(taskByIdResponse.body).toEqual(postResponse.body)
  })

  it('creates a task with a set id (string)', async () => {
    let postResponse = await request(app).post('/tasks').send(taskWithId)

    expect(postResponse.status).toBe(201)
    expect(postResponse.body.id).toBe(taskWithId.id)

    // Check that /tasks returns length of 2
    let tasksResponse = await request(app).get('/tasks')
    expect(tasksResponse.status).toBe(200)
    expect(tasksResponse.body.tasks).toHaveLength(1)

    postResponse = await request(app).post('/tasks').send(taskWithId)

    expect(postResponse.status).toBe(409)
    expect(postResponse.body).toHaveProperty(
      'error',
      `Task ${taskWithId.id} already exists`,
    )

    // Check that /tasks returns length of 2 (unchanged)
    tasksResponse = await request(app).get('/tasks')
    expect(tasksResponse.status).toBe(200)
    expect(tasksResponse.body.tasks).toHaveLength(1)
  })
})
