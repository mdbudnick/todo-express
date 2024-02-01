import app from './src/app'
import https from 'https'
import fs from 'fs'

const privateKey = fs.readFileSync('privatekey.pem', 'utf8')
const certificate = fs.readFileSync('server.crt', 'utf8')
const credentials = { key: privateKey, cert: certificate }

// eslint-disable-next-line no-undef
const port = process.env.APP_PORT ?? 3001
const httpsServer = https.createServer(credentials, app)
httpsServer.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
