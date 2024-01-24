import request from 'supertest'
import app from '../src/app'

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
