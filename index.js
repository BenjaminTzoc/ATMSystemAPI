const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const roleRoutes = require('./src/routes/roleRoutes');
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const homeRoutes = require('./src/routes/virtualBankRoutes/homeRoutes');

const managementRoutes = require('./src/routes/managementRoutes')
const ATMRoutes = require('./src/routes/ATMRoutes/atmRoutes')
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const Database = process.env.DATABASE_URL;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello: ' + Database)
});

app.use('/management', managementRoutes);

app.use('/roles', roleRoutes);
app.use('/user', userRoutes);
app.use('/auth', authRoutes);
app.use('/home', homeRoutes);

app.use('/atm', ATMRoutes);
  
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});