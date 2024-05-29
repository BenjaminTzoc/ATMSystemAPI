const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const router = express.Router();

router.post('/insert-account', async (req, res) => {
    const { customer_id, account_number, balance, account_type_id, account_status, credit_limit, opening_date } = req.body;
  
    try {
      const newAccount = await prisma.account.create({
        data: {
          customer_id,
          account_number,
          balance,
          account_type_id,
          account_status,
          credit_limit,
          opening_date,
        },
      });
  
      res.status(201).json({
        statusCode: 201,
        message: 'Cuenta creada exitosamente',
        data: newAccount,
      });
    } catch (error) {
      res.status(500).json({
        statusCode: 500,
        message: 'Error al crear la cuenta',
        error: error.message,
      });
    }
});

router.post('/insert-card', async (req, res) => {
    const { account_id, card_number, card_type, expiration_date, card_status, card_pin } = req.body;
  
    try {
    const hashedPin = await bcrypt.hash(card_pin, 10);
      const nuevaTarjeta = await prismaClient.tarjeta.create({
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
        data: nuevaTarjeta,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        statusCode: 500,
        message: 'Error al crear la tarjeta',
        error: error.message,
      });
    }
  });

module.exports = router;