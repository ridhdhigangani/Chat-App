const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const {addUser,getUser,removeUser,getUsersInRoom} = require('./utils/users')

const app = express();
const PORT = process.env.PORT || 8000
const server = http.createServer(app);
const io = new socketio(server)

const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));


// io.on('connection', (socket) => {
//   console.log('a user connected');
//   socket.emit('countUpdated',count)

//   socket.on('increment', () => {
//     count++
//     socket.emit('countUpdated',count)
//   })

// });

io.on('connection', (socket) => {

  // socket.emit, io.emit, socket.broadcast.emit
  //io.to.emit, socket.broadcast.to.emit
  //join room
  socket.on('join', ( Options , callback) => {
    const { error, user } = addUser({id:socket.id, ...Options })

    if(error){
        return callback(error);
    }

    socket.join(user.room)

    socket.emit('welcome', generateMessage('Admin',`welcome ${user.username} in ${user.room} Unit`));
    socket.broadcast.to(user.room).emit('welcome', generateMessage('Admin',`${user.username} has joined!`))
 
    io.to(user.room).emit('roomData' , {
      room:user.room,
      users:getUsersInRoom(user.room)
    })

    callback()

  })

  socket.on('inputMsg', (input, callback) => {
    const filter = new Filter()

    if (filter.isProfane(input)) {
      return callback('Profanity is not allowed')
    }
    const user = getUser(socket.id)
    io.to(user.room).emit('welcome', generateMessage(user.username,input));
    callback()
  })

  socket.on('location', (data, callback) => {
    const user = getUser(socket.id)
    const url = `https://google.com/maps?q=${data.latitude},${data.longitude}`
    io.to(user.room).emit('locationMessages', generateLocationMessage(user.username, url));
    callback()
  })

  
  socket.on('disconnect', () => {
    const user = removeUser(socket.id)
   
    if(user){
      io.to(user.room).emit('welcome', generateMessage('Admin',`${user.username} has left`))
      io.to(user.room).emit('roomData',{
        room: user.room,
        users : getUsersInRoom(user.room)
      })
    }
    
    
  })
})

server.listen(PORT, () => {
  console.log(`Port listing on ${PORT}`);
})