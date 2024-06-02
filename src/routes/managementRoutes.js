const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const AuthMiddleware = require('./authMiddleware');

const prisma = new PrismaClient();
const router = express.Router();

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

router.post('/insert_account_type', async (req, res) => {
    const { description } = req.body;
  
    try {
      const newTypeAccount = await prisma.accountType.create({
        data: {
          description,
        },
      });
  
      res.status(201).json({
        statusCode: 201,
        message: 'Tipo de cuenta creado exitosamente',
        data: newTypeAccount,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        statusCode: 500,
        message: 'Error al crear el tipo de cuenta',
        error: error.message,
      });
    }
});

router.post('/insert_account', async (req, res) => {
    const { identification, account_number, balance, account_type_id, 
      account_status, credit_limit } = req.body;
  
    try {
      const customerExist = await prisma.customer.findUnique({
        where: { identification: identification }
      });

      if(!customerExist) {
        return res.status(404).json({
          statusCode: 404,
          message: 'Cliente no encontrado.'
        })
      }

      const accountType = await prisma.accountType.findUnique({
        where: { account_type_id: account_type_id }
      });

      if(!accountType) {
        return res.status(404).json({
          statusCode: 404,
          message: 'Tipo de cuenta no encontrado.'
        })
      }

      const customer_id = customerExist.customer_id;

      const newAccount = await prisma.account.create({
        data: {
          customer_id: customer_id,
          account_number: account_number,
          balance: balance,
          account_type_id: account_type_id,
          account_status: account_status,
          credit_limit: credit_limit,
          opening_date: new Date(),
        },
      });
  
      res.status(201).json({
        statusCode: 201,
        message: 'Cuenta creada exitosamente',
        data: {
          customer_associated: customerExist,
          account_type: accountType,
          new_account: newAccount
        },
      });
    } catch (error) {
      res.status(500).json({
        statusCode: 500,
        message: 'Error al crear la cuenta',
        error: error.message,
      });
    }
});

router.post('/insert_card', async (req, res) => {
    const { account_id, card_number, card_type, expiration_date, card_status, card_pin } = req.body;
  
    try {
    const hashedPin = await bcrypt.hash(card_pin, 10);
      const new_card = await prisma.card.create({
        data: {
          account_id,
          card_number,
          card_type,  
          expiration_date,
          card_status,
          card_pin: hashedPin,
        },
      });
  
      res.status(201).json({
        statusCode: 201,
        message: 'Tarjeta creada exitosamente',
        data: new_card,
      });
    } catch (error) {
      res.status(500).json({
        statusCode: 500,
        message: 'Error al crear la tarjeta',
        error: error.message,
      });
    }
  });

router.post('/insert_type_service', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const newServiceType = await prisma.serviceType.create({
      data: {
        description: description
      }
    });

    res.status(201).json({
      statusCode: 200,
      service_type: newServiceType
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: 'Error al crear el tipo de servicio.',
      error: error.message,
    });
  }
});

router.post('/assign_service', AuthMiddleware.tokenVerification, async (req, res) => {
  const customer_id = req.customer_id
  try {
    const { service_type_id } = req.body;

    if (!customer_id || !service_type_id) {
      return res.status(400).json({ error: 'Customer ID and Service Type ID are required' });
    }

    const customer = await prisma.customer.findUnique({
      where: { customer_id: customer_id }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const serviceType = await prisma.serviceType.findUnique({
      where: { service_type_id: service_type_id }
    });
    if (!serviceType) {
      return res.status(404).json({ error: 'Service Type not found' });
    }

    const serviceBalance = await prisma.serviceBalance.create({
      data: {
        customer_id: customer_id,
        service_type_id: service_type_id,
        updated_date: new Date()
      }
    });

    res.status(201).json(serviceBalance);
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: 'Error al asignar servicio.',
      error: error.message,
    });
  }
});

module.exports = router;