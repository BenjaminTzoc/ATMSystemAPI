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

app.use('/users', authRoutes);
app.use('/roles', roleRoutes);
app.use('/user', userRoutes);
  
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});