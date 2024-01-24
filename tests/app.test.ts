import request from 'supertest'
import app from '../src/app'
import Task, { equalTasks } from '../src/Task'

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

describe('DELETE /tasks/:id', () => {
  it('deletes one task and checks the remaining tasks', async () => {
    await request(app).post('/tasks').send(taskWithId)

    const tasksResponseBeforeDelete = await request(app).get('/tasks')
    expect(tasksResponseBeforeDelete.status).toBe(200)
    expect(tasksResponseBeforeDelete.body.tasks).toHaveLength(1)

    let getTaskResponse = await request(app).get(`/tasks/${taskWithId.id}`)
    expect(getTaskResponse.status).toBe(200)

    let tasksResponse = await request(app).get('/tasks')
    expect(tasksResponse.status).toBe(200)
    expect(tasksResponse.body.tasks).toHaveLength(1)

    const deleteResponse = await request(app).delete(`/tasks/${taskWithId.id}`)
    expect(deleteResponse.status).toBe(200)

    getTaskResponse = await request(app).get(`/tasks/${taskWithId.id}`)
    expect(getTaskResponse.status).toBe(404)

    tasksResponse = await request(app).get('/tasks')
    expect(tasksResponse.status).toBe(200)
    expect(tasksResponse.body.tasks).toHaveLength(0)
  })
})

describe('PUT /tasks/:id', () => {
  let task: Task
  beforeEach(async () => {
    const response = await request(app).post('/tasks').send(newTask)
    task = response.body
  })

  it('updates the title field', async () => {
    const updatedTask = { ...task, title: 'Updated Title' }

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send(updatedTask)
    expect(response.status).toBe(200)

    // Check that fields in the response are as expected
    expect(response.body.title).toBe(updatedTask.title)

    // Check that the task returned from GET /tasks/:id is as expected
    const taskByIdResponse = await request(app).get(`/tasks/${task.id}`)
    expect(taskByIdResponse.status).toBe(200)
    expect(equalTasks(taskByIdResponse.body, { ...task, ...updatedTask })).toBe(
      true,
    )
  })

  it('updates the description field', async () => {
    const updatedTask = { ...task, description: 'Updated Description' }

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send(updatedTask)
    expect(response.status).toBe(200)

    // Check that fields in the response are as expected
    expect(response.body.description).toBe(updatedTask.description)

    // Check that the task returned from GET /tasks/:id is as expected
    const taskByIdResponse = await request(app).get(`/tasks/${task.id}`)
    expect(taskByIdResponse.status).toBe(200)
    expect(equalTasks(taskByIdResponse.body, { ...task, ...updatedTask })).toBe(
      true,
    )
  })

  it('updates the completed field', async () => {
    const updatedTask = { ...task, completed: true }

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send(updatedTask)
    expect(response.status).toBe(200)

    // Check that fields in the response are as expected
    expect(response.body.completed).toBe(updatedTask.completed)

    // Check that the task returned from GET /tasks/:id is as expected
    const taskByIdResponse = await request(app).get(`/tasks/${task.id}`)
    expect(taskByIdResponse.status).toBe(200)
    expect(equalTasks(taskByIdResponse.body, { ...task, ...updatedTask })).toBe(
      true,
    )
  })

  it('returns 405 when attempting to update the id field', async () => {
    const updatedTask = { ...task, id: 'newId' }

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send(updatedTask)
    expect(response.status).toBe(405)
    expect(response.body).toHaveProperty('error', 'Unable to modify Task id')
  })
})
