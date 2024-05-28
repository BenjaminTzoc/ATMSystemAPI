const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./src/routes/authRoutes');
const roleRoutes = require('./src/routes/roleRoutes');
const userRoutes = require('./src/routes/userRoutes');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World')
});

app.get('/ping', async (req, res) => {
    try {
        const roles = await prisma.rolUsuario.findMany();
        res.json(roles);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching roles' });
      }
});

app.use('/users', authRoutes);
app.use('/roles', roleRoutes);
app.use('/user', userRoutes);
  
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});