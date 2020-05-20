/* eslint-disable import/no-duplicates */
import express from 'express'
import path from 'path'
import cors from 'cors'
import bodyParser from 'body-parser'
import sockjs from 'sockjs'
import axios from 'axios'

import cookieParser from 'cookie-parser'
import Html from '../client/html'

let connections = []

const port = process.env.PORT || 3000
const server = express()

const { readFile, writeFile, unlink } = require('fs').promises; 

const setHeaders = (req, res, next) => {
  res.set('x-skillcrucial-user', '1bc51bc4-3cfb-4577-a95c-3beb518309cb');  
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  next()
}

const saveFile = async (text) => {
  return writeFile(`${__dirname}/test.json`, JSON.stringify(text), { encoding: "utf8" });  
}

const fileRead = async () => {
  return readFile(`${__dirname}/test.json`, { encoding: "utf8" })  
  .then(text => JSON.parse(text))  
  .catch(async () => {
    const { data: users } = await axios('https://jsonplaceholder.typicode.com/users')
    await saveFile(users)
    return users
  })  
}

server.use(cors())

server.use(express.static(path.resolve(__dirname, '../dist/assets')))
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
server.use(bodyParser.json({ limit: '50mb', extended: true }))

server.use(cookieParser())

server.use(setHeaders)

server.get('/api/v1/users', async (req, res) => {
  const users = await fileRead()
  res.json(users)
})

server.post('/api/v1/users', async (req, res) => {
  const users = await fileRead()
  const newUserBody = req.body
  newUserBody.id = users.length + 1
  users.push(newUserBody)
  saveFile(users)
  res.json({status: 'success', id: newUserBody.id})
})

server.patch('/api/v1/users/:userId', async (req, res) => {
  const users = await fileRead()
  const { userId } = req.params
  const newArray = users.map((it) => (it.id === +userId ? Object.assign(it, req.body) : it))
  saveFile(newArray)
  res.json({status: 'success', id: userId})
})

server.delete('/api/v1/users/:userId', async (req, res) => {
  const users = await fileRead()
  const { userId } = req.params 
  const newArray = users.filter(it => it.id !== +userId)
  saveFile(newArray)
  res.json({ status: 'success', id: userId })
})


server.delete('/api/v1/users', async (req, res) => {
  unlink(`${__dirname}/test.json`) 
  res.json()
})

server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const echo = sockjs.createServer()
echo.on('connection', (conn) => {
  connections.push(conn)
  conn.on('data', async () => {})

  conn.on('close', () => {
    connections = connections.filter((c) => c.readyState !== 3)
  })
})

server.get('/', (req, res) => {
  // const body = renderToString(<Root />);
  const title = 'Server side Rendering'
  res.send(
    Html({
      body: '',
      title
    })
  )
})

server.get('/*', (req, res) => {
  const initialState = {
    location: req.url
  }

  return res.send(
    Html({
      body: '',
      initialState
    })
  )
})

const app = server.listen(port)

echo.installHandlers(app, { prefix: '/ws' })

// eslint-disable-next-line no-console
console.log(`Serving at http://localhost:${port}`)

