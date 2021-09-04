const http = require('http')
const express = require('express')
const multer = require('multer')
const WebSocket = require('ws')
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/img')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    },
})
const upload = multer({ storage })

const app = express()
app.use(express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/index.html'))
})

app.post('/upload', upload.single('image'), (req, res) => {
    res.status(200).send({ image: `/img/${req.file.filename}` })
})

const server = http.createServer(app)
const webSocketServer = new WebSocket.Server({ port: 5000 })
const connections = new Map()
const defaultPic = '/img/no-image.jpg'

webSocketServer.on('connection', ws => {
    connections.set(ws, {})
    ws.on('message', m => {
        const data = JSON.parse(m)
        switch (data.type) {
            case 'login':
                connections.get(ws).userLogin = data.name
                connections.get(ws).image = defaultPic
                broadcastMessage({
                        type: 'login',
                        data: [...connections.values()]
                            .map((item) => ({
                                userLogin: item.userLogin,
                                image: item.image,
                            }))
                            .filter(Boolean)
                    }, ws, false)
                break
            case 'message':
                broadcastMessage({
                    type: 'message',
                    data: data.message
                }, ws, false)
                break
            case 'avatar':
                const image = data.data
                connections.get(ws).image = image
                broadcastMessage({
                        type: 'avatar',
                        data: {
                            image,
                            from: connections.get(ws).userLogin,
                        }
                    }, ws, false)
                break
        }
    })

    ws.on('close', () => {
        broadcastMessage({ type: 'log-out' }, ws)
        connections.delete(ws)
    })
})

server.listen(3000, () => console.log('Server started'))

function broadcastMessage(message, from, excludeSelf = true) {
    const socketData = connections.get(from)
    if (!socketData) return false
    message.from = socketData.userLogin
    for (const connection of connections.keys()) {
        if (connection === from && excludeSelf) continue
        connection.send(JSON.stringify(message))
    }
}