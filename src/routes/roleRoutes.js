const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

// Handler para crear un nuevo rol
router.post('/add_role', async (req, res) => {
  const { description } = req.body;

  try {
    const newRol = await prisma.userRole.create({
      data: {
        description,
      },
    });

    res.status(201).json({
      statusCode: 200,
      message: 'Rol insertado correctamente',
      data: {
        user_role: newRol
      }
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: 'Error del servidor',
      data:{
        error: error.message
      }
    });
  }
});

router.get('/get_roles', async (req, res) => {
  try {
    const roles = await prisma.userRole.findMany();
    res.status(201).json({
      statusCode: 200,
      message: 'Consulta de roles exitosa.',
      data: {
        roles: roles
      }
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: 'Error del servidor',
      data:{
        error: error.message
      }
    });
  }
});

module.exports = router;
