const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

//HANDLER PARA REALIZAR UN INICIO DE SESION
router.post('/login', async (req, res) => {
  const { user_name, password } = req.body;

  try {
    //BUSCA EL USUARIO O EMAIL EN LA BD
    const user = await prisma.user.findFirst({
      where: {
        OR: [ //VALIDACION TANTO DE USUARIO COMO DE EMAIL
          { user_name },
          { email: user_name }
        ]
      }
    });
    console.log(user)

    if (!user) { //SI EL USUARIO NO SE ENCUENTRA
      return res.status(401).json({
        statusCode: 401,
        message: 'Nombre de usuario o contraseña incorrectos.'
      });
    }

    if (user.user_status !== 'A') { //SI EL ESTADO DEL USUARIO NO ES ACTIVO
      return res.status(400).json({
        statusCode: 400,
        message: 'Tu usuario no está activo. Por favor, ponte en contacto con soporte técnico.'
      });
    }
    //SE COMPARAN LAS CONTRASEÑAS ENCRIPTADAS
    const validPassword = await bcrypt.compare(password, user.password);
    console.log(validPassword, password, user.password)
    //SI LA CONTRASEÑA NO COINCIDE
    if (!validPassword) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Nombre de usuario o contraseña incorrectos.'
      });
    }
    //SE GENERA UN NUEVO TOKEN JWT
    const token = jwt.sign(
      { user_id: user.user_id, user_name: user.user_name },
      process.env.JWT_SECRET,
      { expiresIn: '5m' } // SE LE ESTABLECE UN TIEMPO DE VIDA
    );

    res.json({ token });  //SE IMPRIME EL TOKEN
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

router.post('/atm_login', async (req, res) => {
  const {card_number, card_pin} = req.body;

  try {
    const card = await prisma.card.findUnique({
      where: { card_number: card_number },
      include: {
        account: {
          include: {
            customer: true
          }
        }
      }
    });
    //SI NINGUNA TARJETA COINCIDE, DEVUELVE ERROR
    if(!card) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Tarjeta no encontrada.'
      });
    }
    //SI LA CONTRASEÑA NO COINCIDE, DEVUELVE ERROR
    const isPinValid = bcrypt.compareSync(card_pin, card.card_pin);

    if(!isPinValid) {
      return res.status(401).json({
        statusCode: 401,
        message: 'PIN incorrecto.'
      });
    }
    //SI LA TARJETA NO ESTÁ ACTIVA, DEVUELVE ERROR
    if(card.card_status !== 'A') {
      return res.status(400).json({
        statusCode: 400,
        message: 'Tu tarjeta no está activa. Por favor, ponte en contacto con soporte técnico.'
      })
    }
    //GENERA NUEVO TOKEN DE INICIO DE SESION
    const token = jwt.sign(
      { card_id: card.card_id, account_id: card.account_id },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    res.json({
      statusCode: 200,
      token: token,
      message: 'Inicio de sesión exitoso.',
      data: {
        card: {
          id: card.card_id,
          card_number: card.card_number,
          card_type: card.card_type,
          expiration_date: card.expiration_date,
          card_status: card.card_status,
          account: {
            account_number: card.account.account_number,
            balance: card.account.balance,
            customer: {
              customer_name: card.account.customer.name,
              customer_address: card.account.customer.address,
              customer_telephone: card.account.customer.telephone,
              customer_email: card.account.customer.email
            }
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      message: 'Error del servidor.',
      data: {
        error: error.message
      }
    });
  }
})
  
module.exports = router;