const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./src/routes/authRoutes');
const roleRoutes = require('./src/routes/roleRoutes');
const userRoutes = require('./src/routes/userRoutes');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const Database = process.env.DATABASE_URL;
const Host = process.env.PG_HOST;
const Port2 = process.env.PG_PORT;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World: ' + Database)
});

app.get('/ping', async (req, res) => {
    try {
        const roles = await prisma.rolUsuario.findMany();
        res.json(roles);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: error });
      }
});

app.use('/users', authRoutes);
app.use('/roles', roleRoutes);
app.use('/user', userRoutes);
  
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});