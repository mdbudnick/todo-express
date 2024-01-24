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

const newTaskNoId = {
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
    const postResponse = await request(app).post('/tasks').send(newTaskNoId)

    expect(postResponse.status).toBe(201)
    expect(postResponse.body).toHaveProperty('id')
    expect(postResponse.body.title).toBe(newTaskNoId.title)
    expect(postResponse.body.description).toBe(newTaskNoId.description)
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

  it('returns 400 when id is not string | number', async () => {
    const postResponse = await request(app)
      .post('/tasks')
      .send({ ...newTaskNoId, id: true })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task; id must be string or number',
    )
  })

  it('returns 400 when title is not provided', async () => {
    const postResponse = await request(app)
      .post('/tasks')
      .send({ ...newTaskNoId, title: '' })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task; title required',
    )
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
    const response = await request(app).post('/tasks').send(newTaskNoId)
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

  it('defaults to empty description field if not provided', async () => {
    const updatedTask = { ...task, description: undefined }

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send(updatedTask)
    expect(response.status).toBe(200)

    // Check that fields in the response are as expected
    expect(response.body.description).toBe('')

    // Check that the task returned from GET /tasks/:id is as expected
    const taskByIdResponse = await request(app).get(`/tasks/${task.id}`)
    expect(taskByIdResponse.status).toBe(200)
    expect(
      equalTasks(taskByIdResponse.body, { ...task, description: '' }),
    ).toBe(true)
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

  it('returns 404 when attempting to update a non-existent Task', async () => {
    const updatedTask = { ...task }

    const response = await request(app).put('/tasks/fakeId').send(updatedTask)
    expect(response.status).toBe(404)
    expect(response.body).toHaveProperty('error', 'Task fakeId not found')
  })

  it('returns 405 when attempting to update the id field', async () => {
    const updatedTask = { ...task, id: 'newId' }

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send(updatedTask)
    expect(response.status).toBe(405)
    expect(response.body).toHaveProperty('error', 'Unable to modify Task id')
  })

  it('returns 400 when attempting to remove title', async () => {
    const updatedTask = { ...task, title: '' }

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send(updatedTask)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty(
      'error',
      'Invalid update; title required',
    )
  })

  it('returns 400 when attempting to remove completed', async () => {
    const updatedTask = { ...task, completed: undefined }

    const response = await request(app)
      .put(`/tasks/${task.id}`)
      .send(updatedTask)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty(
      'error',
      'Invalid update; completed required',
    )
  })
})
