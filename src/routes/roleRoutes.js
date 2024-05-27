const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Handler para crear un nuevo rol
router.post('/add-role', async (req, res) => {
  const { descripcion } = req.body;

  try {
    const newRol = await prisma.rolUsuario.create({
      data: {
        descripcion,
      },
    });

    res.status(201).json(newRol);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating role' });
  }
});

router.get('/get-roles', async (req, res) => {
  try {
    const roles = await prisma.rolUsuario.findMany();
    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching roles' });
  }
});

module.exports = router;
