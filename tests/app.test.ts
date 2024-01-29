import request from 'supertest'
import app from '../src/app'
import Task, { equalTasks } from '../src/models/Task'

const TEST_SESSION_UUID = 'DD9ABBC3-5F39-4023-BBF0-8CB0EF3B5AB7'
const agent = request.agent(app)
agent.set('Cookie', [`session=${TEST_SESSION_UUID}`])

afterEach(async () => {
  let tasksResponse = await agent.get('/v1/tasks')
  for (const task of tasksResponse.body.tasks) {
    await agent.delete(`/v1/tasks/${task.id}`)
  }
  tasksResponse = await agent.get('/v1/tasks')
  expect(tasksResponse.body.tasks).toHaveLength(0)
})

describe('GET /', () => {
  it('responds with a redirect to /v1/tasks', async () => {
    const response = await agent.get('/')
    expect(response.status).toBe(302)
    expect(response.header.location).toBe('/v1/tasks')
    return
  })
})

describe('GET /v1/tasks', () => {
  it('responds with JSON containing tasks', async () => {
    const response = await agent.get('/v1/tasks')
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

describe('POST /v1/tasks', () => {
  it('creates a task without a set id', async () => {
    const postResponse = await agent.post('/v1/tasks').send(newTaskNoId)

    expect(postResponse.status).toBe(201)
    expect(postResponse.body).toHaveProperty('id')
    expect(postResponse.body.title).toBe(newTaskNoId.title)
    expect(postResponse.body.description).toBe(newTaskNoId.description)
    expect(postResponse.body.completed).toBe(false) // false is default

    const taskId = postResponse.body.id

    const tasksResponse = await agent.get('/v1/tasks')
    expect(tasksResponse.status).toBe(200)
    expect(tasksResponse.body.tasks).toHaveLength(1)

    const taskByIdResponse = await agent.get(`/v1/tasks/${taskId}`)
    expect(taskByIdResponse.status).toBe(200)
    expect(taskByIdResponse.body).toEqual(postResponse.body)
  })

  it('creates a task without a description', async () => {
    const postResponse = await agent
      .post('/v1/tasks')
      .send({ ...newTaskNoId, description: undefined })
    expect(postResponse.status).toBe(201)
    expect(postResponse.body).toHaveProperty('id')
    expect(postResponse.body.title).toBe(newTaskNoId.title)
    expect(postResponse.body.description).toBe('')
    expect(postResponse.body.completed).toBe(false)

    const taskId = postResponse.body.id

    const tasksResponse = await agent.get('/v1/tasks')
    expect(tasksResponse.status).toBe(200)
    expect(tasksResponse.body.tasks).toHaveLength(1)
    expect(tasksResponse.body.total).toBe(1)

    const taskByIdResponse = await agent.get(`/v1/tasks/${taskId}`)
    expect(taskByIdResponse.status).toBe(200)
    expect(taskByIdResponse.body).toEqual(postResponse.body)
  })

  it('creates a task with a set id (string)', async () => {
    let postResponse = await agent.post('/v1/tasks').send(taskWithId)

    expect(postResponse.status).toBe(201)
    expect(postResponse.body.id).toBe(taskWithId.id)

    let tasksResponse = await agent.get('/v1/tasks')
    expect(tasksResponse.status).toBe(200)
    expect(tasksResponse.body.tasks).toHaveLength(1)
    expect(tasksResponse.body.total).toBe(1)

    postResponse = await agent.post('/v1/tasks').send(taskWithId)

    expect(postResponse.status).toBe(409)
    expect(postResponse.body).toHaveProperty(
      'error',
      `Task ${taskWithId.id} already exists`,
    )

    tasksResponse = await agent.get('/v1/tasks')
    expect(tasksResponse.status).toBe(200)
    expect(tasksResponse.body.tasks).toHaveLength(1)
    expect(tasksResponse.body.total).toBe(1)
  })

  it('returns 400 when id is not string | number', async () => {
    let postResponse = await agent
      .post('/v1/tasks')
      .send({ ...newTaskNoId, id: true })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task: id must be string or number',
    )

    postResponse = await agent
      .post('/v1/tasks')
      .send({ ...newTaskNoId, id: {} })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task: id must be string or number',
    )
  })

  it('returns 400 when title is not string', async () => {
    let postResponse = await agent
      .post('/v1/tasks')
      .send({ ...newTaskNoId, title: [] })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task: title must be string',
    )

    postResponse = await agent
      .post('/v1/tasks')
      .send({ ...newTaskNoId, title: null })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task: title must be string',
    )
  })

  it('returns 400 when description is not string', async () => {
    const postResponse = await agent
      .post('/v1/tasks')
      .send({ ...newTaskNoId, description: 456 })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task: description must be string',
    )
  })

  it('returns 400 when completed is not boolean', async () => {
    const postResponse = await agent
      .post('/v1/tasks')
      .send({ ...newTaskNoId, completed: 'true' })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task: completed must be boolean',
    )
  })

  it('returns 400 when title is not provided', async () => {
    const postResponse = await agent
      .post('/v1/tasks')
      .send({ ...newTaskNoId, title: '' })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task: title required',
    )
  })
})

describe('DELETE /v1/tasks/:id', () => {
  it('deletes one task and checks the remaining tasks', async () => {
    await agent.post('/v1/tasks').send(taskWithId)

    const tasksResponseBeforeDelete = await agent.get('/v1/tasks')
    expect(tasksResponseBeforeDelete.status).toBe(200)
    expect(tasksResponseBeforeDelete.body.tasks).toHaveLength(1)
    expect(tasksResponseBeforeDelete.body.total).toBe(1)

    let getTaskResponse = await agent.get(`/v1/tasks/${taskWithId.id}`)
    expect(getTaskResponse.status).toBe(200)

    let tasksResponse = await agent.get('/v1/tasks')
    expect(tasksResponse.status).toBe(200)
    expect(tasksResponse.body.tasks).toHaveLength(1)
    expect(tasksResponse.body.total).toBe(1)

    const deleteResponse = await agent.delete(`/v1/tasks/${taskWithId.id}`)
    expect(deleteResponse.status).toBe(204)

    getTaskResponse = await agent.get(`/v1/tasks/${taskWithId.id}`)
    expect(getTaskResponse.status).toBe(404)

    tasksResponse = await agent.get('/v1/tasks')
    expect(tasksResponse.status).toBe(200)
    expect(tasksResponse.body.tasks).toHaveLength(0)
    expect(tasksResponse.body.total).toBe(0)
  })
})

describe('PUT /v1/tasks/:id', () => {
  let task: Task
  beforeEach(async () => {
    const response = await agent.post('/v1/tasks').send(newTaskNoId)
    task = response.body
  })

  it('updates the title field', async () => {
    const updatedTask = { ...task, title: 'Updated Title' }

    const response = await agent.put(`/v1/tasks/${task.id}`).send(updatedTask)
    expect(response.status).toBe(200)

    // Check that fields in the response are as expected
    expect(response.body.title).toBe(updatedTask.title)

    // Check that the task returned from GET /v1/tasks/:id is as expected
    const taskByIdResponse = await agent.get(`/v1/tasks/${task.id}`)
    expect(taskByIdResponse.status).toBe(200)
    expect(equalTasks(taskByIdResponse.body, { ...task, ...updatedTask })).toBe(
      true,
    )
  })

  it('updates the description field', async () => {
    const updatedTask = { ...task, description: 'Updated Description' }

    const response = await agent.put(`/v1/tasks/${task.id}`).send(updatedTask)
    expect(response.status).toBe(200)

    // Check that fields in the response are as expected
    expect(response.body.description).toBe(updatedTask.description)

    // Check that the task returned from GET /v1/tasks/:id is as expected
    const taskByIdResponse = await agent.get(`/v1/tasks/${task.id}`)
    expect(taskByIdResponse.status).toBe(200)
    expect(equalTasks(taskByIdResponse.body, { ...task, ...updatedTask })).toBe(
      true,
    )
  })

  it('defaults to empty description field if not provided', async () => {
    const updatedTask = { ...task, description: undefined }

    const response = await agent.put(`/v1/tasks/${task.id}`).send(updatedTask)
    expect(response.status).toBe(200)

    // Check that fields in the response are as expected
    expect(response.body.description).toBe('')

    // Check that the task returned from GET /v1/tasks/:id is as expected
    const taskByIdResponse = await agent.get(`/v1/tasks/${task.id}`)
    expect(taskByIdResponse.status).toBe(200)
    expect(
      equalTasks(taskByIdResponse.body, { ...task, description: '' }),
    ).toBe(true)
  })

  it('updates the completed field', async () => {
    const updatedTask = { ...task, completed: true }

    const response = await agent.put(`/v1/tasks/${task.id}`).send(updatedTask)
    expect(response.status).toBe(200)

    // Check that fields in the response are as expected
    expect(response.body.completed).toBe(updatedTask.completed)

    // Check that the task returned from GET /v1/tasks/:id is as expected
    const taskByIdResponse = await agent.get(`/v1/tasks/${task.id}`)
    expect(taskByIdResponse.status).toBe(200)
    expect(equalTasks(taskByIdResponse.body, { ...task, ...updatedTask })).toBe(
      true,
    )
  })

  it('returns 404 when attempting to update a non-existent Task', async () => {
    const updatedTask = { ...task }

    const response = await agent.put('/v1/tasks/fakeId').send(updatedTask)
    expect(response.status).toBe(404)
    expect(response.body).toHaveProperty('error', 'Task fakeId not found')
  })

  it('returns 405 when attempting to update the id field', async () => {
    const updatedTask = { ...task, id: 'newId' }

    const response = await agent.put(`/v1/tasks/${task.id}`).send(updatedTask)
    expect(response.status).toBe(405)
    expect(response.body).toHaveProperty('error', 'Unable to modify Task id')
  })

  it('returns 400 when attempting to remove title', async () => {
    const updatedTask = { ...task, title: '' }

    const response = await agent.put(`/v1/tasks/${task.id}`).send(updatedTask)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty(
      'error',
      'Invalid Task: title required',
    )
  })

  it('returns 400 when attempting to remove completed', async () => {
    const updatedTask = { ...task, completed: undefined }

    const response = await agent.put(`/v1/tasks/${task.id}`).send(updatedTask)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty(
      'error',
      'Invalid Task: completed required',
    )
  })

  it('returns 400 when title is not string', async () => {
    let postResponse = await agent
      .put(`/v1/tasks/${task.id}`)
      .send({ ...task, title: [] })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task: title must be string',
    )

    postResponse = await agent
      .put(`/v1/tasks/${task.id}`)
      .send({ ...task, title: null })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task: title must be string',
    )
  })

  it('returns 400 when description is not string', async () => {
    const postResponse = await agent
      .put(`/v1/tasks/${task.id}`)
      .send({ ...task, description: 456 })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task: description must be string',
    )
  })

  it('returns 400 when completed is not boolean', async () => {
    const postResponse = await agent
      .put(`/v1/tasks/${task.id}`)
      .send({ ...task, completed: 'true' })

    expect(postResponse.status).toBe(400)
    expect(postResponse.body).toHaveProperty(
      'error',
      'Invalid Task: completed must be boolean',
    )
  })
})
