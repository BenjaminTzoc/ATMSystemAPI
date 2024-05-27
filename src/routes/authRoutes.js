const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const AuthMiddleware = require('./authMiddleware');

const prisma = new PrismaClient();
const router = express.Router();

//HANDLER PARA REGISTRAR NUEVOS USUARIOS EN LA BD
router.post('/add-user', async (req, res) => {
  const {
    nombre_usuario,
    contrasena,
    rol_id,
    email,
    telefono,
    estado_usuario,
    nombre_cliente,
    apellido_cliente,
    direccion_cliente,
    email_cliente,
    telefono_cliente,
    identificacion_cliente,
    fecha_nacimiento_cliente,
    estado_civil_cliente,
    genero_cliente,
    nacionalidad_cliente,
  } = req.body;

  try {
    // Encriptar la contraseña del usuario
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Si no se proporcionan email_cliente y telefono_cliente, utilizar los valores de email y telefono
    const finalEmailCliente = email_cliente || email;
    const finalTelefonoCliente = telefono_cliente || telefono;

    // Crear usuario y cliente en una transacción
    const newUsuarioCliente = await prisma.$transaction(async (prisma) => {
      // Crear el usuario
      const newUsuario = await prisma.usuario.create({
        data: {
          nombre_usuario,
          contrasena: hashedPassword,
          rol_id,
          email,
          telefono,
          fecha_ultimo_inicio_sesion: new Date(),
          estado_usuario,
          fecha_creacion: new Date(),
        },
      });

      // Crear el cliente asociado al usuario
      const newCliente = await prisma.cliente.create({
        data: {
          nombre: nombre_cliente,
          apellido: apellido_cliente,
          direccion: direccion_cliente,
          telefono: finalTelefonoCliente,
          email: finalEmailCliente,
          identificacion: identificacion_cliente,
          fecha_nacimiento: new Date(fecha_nacimiento_cliente),
          estado_civil: estado_civil_cliente,
          genero: genero_cliente,
          nacionalidad: nacionalidad_cliente,
          fecha_creacion: new Date(),
          user: {
            connect: { usuario_id: newUsuario.usuario_id },
          },
        },
      });

      return { newUsuario, newCliente };
    });

    res.status(201).json({
      message: 'Cliente y usuario creados exitosamente',
      usuario: newUsuarioCliente.newUsuario,
      cliente: newUsuarioCliente.newCliente,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating user and client' });
  }
});

//HANDLER PARA REALIZAR UN INICIO DE SESION
router.post('/login', async (req, res) => {
  const { nombre_usuario, contrasena } = req.body;

  try {
    // Busca el usuario en la base de datos utilizando nombre de usuario o correo electrónico
    const usuario = await prisma.usuario.findFirst({
      where: {
        OR: [
          { nombre_usuario },
          { email: nombre_usuario } // Se asume que 'nombre_usuario' puede contener el email
        ]
      }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Nombre de usuario o contraseña incorrectos' });
    }

    if (usuario.estado_usuario !== 'A') {
      return res.status(400).json({ error: 'Tu usuario no está activo. Por favor, ponte en contacto con soporte técnico.' });
    }

    const validPassword = await bcrypt.compare(contrasena, usuario.contrasena);

    if (!validPassword) {
      return res.status(401).json({ error: 'Nombre de usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { usuarioId: usuario.usuario_id, nombre_usuario: usuario.nombre_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Endpoint para obtener datos del usuario
router.get('/get-profile', AuthMiddleware.verificarToken, async (req, res) => {
  try {
    // Obtiene el ID del usuario a partir del token JWT
    const usuarioId = req.usuarioId;

    // Busca el usuario en la base de datos
    const usuario = await prisma.usuario.findUnique({
      where: { usuario_id: usuarioId },
      select: {
        nombre_usuario: true,
        email: true,
        telefono: true,
        fecha_ultimo_inicio_sesion: true,
        rol: {
          select: {
            descripcion: true
          }
        },
        cliente: {
          select: {
            nombre: true,
            apellido: true,
            direccion: true,
            email: true,
            telefono: true,
            identificacion: true,
            fecha_nacimiento: true,
            estado_civil: true,
            genero: true,
            nacionalidad: true
          }
        }
      }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Estructura de respuesta
    const userProfile = {
      nombre_usuario: usuario.nombre_usuario,
      rol: usuario.rol.descripcion,
      email: usuario.email,
      telefono: usuario.telefono,
      fecha_ultimo_inicio_sesion: usuario.fecha_ultimo_inicio_sesion,
      cliente: {
        nombre: usuario.cliente.nombre,
        apellido: usuario.cliente.apellido,
        direccion: usuario.cliente.direccion,
        email_cliente: usuario.cliente.email,
        telefono_cliente: usuario.cliente.telefono,
        identificacion: usuario.cliente.identificacion,
        fecha_nacimiento: usuario.cliente.fecha_nacimiento,
        estado_civil: usuario.cliente.estado_civil,
        genero: usuario.cliente.genero,
        nacionalidad: usuario.cliente.nacionalidad
      }
    };

    res.json(userProfile); // Devuelve los datos del perfil del usuario
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/get-accounts', AuthMiddleware.verificarToken, async (req, res) => {
  try {
    // Obtiene el ID del usuario a partir del token JWT
    const usuarioId = req.usuarioId;

    // Busca el cliente asociado al usuario
    const cliente = await prisma.cliente.findFirst({
      where: { userId: usuarioId },
      include: { cuentas: true } // Incluye las cuentas del cliente en la respuesta
    });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Devuelve las cuentas del cliente
    res.json(cliente.cuentas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

  
module.exports = router;