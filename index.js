// server/index.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')

const app = express()
const port = process.env.PORT || 3000

// Middleware
const corsOptions = {
  origin: ['http://localhost:5173'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())

// MongoDB Client
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).send({ error: true, message: 'Unauthorized access' })
  }
  const token = authHeader.split(' ')[1]
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: 'Forbidden access' })
    }
    req.user = decoded
    next()
  })
}

async function run() {
  const db = client.db('MedEasyDB')
  const usersCollection = db.collection('users')

  try {
    // Create JWT
    app.post('/jwt', async (req, res) => {
      const user = req.body
      if (!user || !user.email) return res.status(400).send({ error: true, message: 'Invalid user data' })

      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '7d' })
      res.send({ token })
    })

    // Save or update user in db
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email
      const userData = req.body
      if (!email || !userData) return res.status(400).send({ error: true, message: 'Missing user data' })

      const query = { email }
      const options = { upsert: true }
      const updateDoc = { $set: userData }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })

    // Get user role in db
    app.get('/users/role/:email', verifyJWT, async (req, res) => {
      const email = req.params.email
      const result = await usersCollection.findOne(
        { email },
        { projection: { role: 1 } }
      )
      res.send(result)
    })


    await client.db('admin').command({ ping: 1 })
    console.log('Connected to MongoDB ✅')
  } catch (err) {
    console.error('DB connection error:', err)
  }
}

run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from MedEasy server ✅')
})

app.listen(port, () => {
  console.log(`MedEasy server running on port ${port}`)
})
