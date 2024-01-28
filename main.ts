import app from './src/app'

// eslint-disable-next-line no-undef
const port = process.env.APP_PORT ?? 3001

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
