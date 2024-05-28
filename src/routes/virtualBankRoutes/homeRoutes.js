const express = require('express');
const { PrismaClient } = require('@prisma/client');
const AuthMiddleware = require('../authMiddleware');

const prisma = new PrismaClient();
const router = express.Router();

// Endpoint para obtener datos del usuario
router.get('/get_profile', AuthMiddleware.tokenVerification, async (req, res) => {
    try {
      // Obtiene el ID del usuario a partir del token JWT
      const user_id = req.user_id;
  
      // Busca el usuario en la base de datos
      const user = await prisma.user.findUnique({
        where: { user_id: user_id },
        select: {
          user_name: true,
          email: true,
          last_login: true,
          role: {
            select: {
              description: true
            }
          },
          customer: {
            select: {
              name: true,
              address: true,
              email: true,
              telephone: true,
              identification: true,
              birthdate: true,
              civil_status: true,
              gender: true,
              nationality: true
            }
          }
        }
      });
  
      if (!user) {
        return res.status(404).json({
          statusCode: 404,
          message: 'Usuario no encontrado.'
        });
      }
  
      // Estructura de respuesta
      const userProfile = {
        user_name: user.user_name,
        role: user.role.description,
        email: user.email,
        last_login: user.last_login,
        customer: {
          name: user.customer.name,
          address: user.customer.address,
          email: user.customer.email,
          telephone: user.customer.telephone,
          identification: user.customer.identification,
          birthdate: user.customer.birthdate,
          civil_status: user.customer.civil_status,
          gender: user.customer.gender,
          nationality: user.customer.nationality
        }
      };
  
      res.json(userProfile); // Devuelve los datos del perfil del usuario
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
  
  router.get('/get-accounts', AuthMiddleware.tokenVerification, async (req, res) => {
    try {
      // Obtiene el ID del usuario a partir del token JWT
      const user_id = req.user_id;
  
      // Busca el cliente asociado al usuario
      const customer = await prisma.customer.findFirst({
        where: { user_id: user_id },
        include: { accounts: true } // Incluye las cuentas del cliente en la respuesta
      });
  
      if (!customer) {
        return res.status(404).json({
          statusCode: 404,
          message: 'Cliente no encontrado'
        });
      }
  
      // Devuelve las cuentas del cliente
      res.json(customer.accounts);
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