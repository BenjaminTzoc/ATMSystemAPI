const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const AuthMiddleware = require('../authMiddleware');

const prisma = new PrismaClient();
const router = express.Router();

router.post('/verify_card', async (req, res) => {
    const { card_number } = req.body;

    try {
        const card = await prisma.card.findUnique({
            where: { card_number: card_number },
            include: {
                account: {
                    include: {
                        customer: {
                            include: {
                                user: true
                            }
                        }
                    }
                }
            }
        });

        if(!card) {
            return res.status(401).json({
                statusCode: 401,
                message: 'Tarjeta no encontrada.'
            });
        }

        function obfuscateCardNumber(cardNumber) {
            const parts = cardNumber.split(' ');
            if (parts.length !== 4) {
                throw new Error('Formato de número de tarjeta inválido');
            }
            parts[1] = '***';
            parts[2] = '***';
            return parts.join(' ');
        }

        const obfuscatedCardNumber = obfuscateCardNumber(card.card_number);

        res.status(200).json({
            statusCode: 200,
            message: 'Tarjeta verificada exitosamente.',
            data: {
              card_number: obfuscatedCardNumber,
              user_name: card.account.customer.user.user_name,
              expiration_date: card.expiration_date,
            },
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error del servidor',
            error: error.message,
        });
    }
});

router.post('/verify_pin', async (req, res) => {
    const { card_number, pin } = req.body;

    try {
        const card = await prisma.card.findUnique({
            where: { card_number: card_number }
        });

        if(!card) {
            return res.status(401).json({
                statusCode: 401,
                message: 'Tarjeta no encontrada.'
            });
        }

        const isPinValid = await bcrypt.compare(pin, card.card_pin);
        if(!isPinValid){
            return res.status(401).json({
                statusCode: 401,
                message: 'PIN incorrecto.'
            });
        }

        const token = jwt.sign(
            {
                card_id: card.card_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '5m' }
        );

        res.status(200).json({
            statusCode: 200,
            message: 'Tarjeta y PIN verificados exitosamente.',
            data: { token }
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error del servidor',
            error: error.message,
        });
    }
});

router.get('/get_balance', AuthMiddleware.tokenVerification, async (req, res) => {
    const { account_id } = req.query;

    try {
        const account = await prisma.account.findUnique({
            where: { account_id: parseInt(account_id) },
            select: { balance: true }
        });

        //SI NINGUNA CUENTA COINCIDE, DEVUELVE ERROR
        if(!account) {
            return res.status(404).json({
                statusCode: 404,
                message: 'Cuenta no encontrada.'
            });
        }
        //SI LA CUENTA COINCIDE, DEVUELVE EL SALDO
        res.status(200).json({
            statusCode: 200,
            message: 'Consulta de saldo exitosa.',
            data: {
                balance: account.balance
            }
        })
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error del servidor',
            data: { error: error.message }
        });
    }
});

router.post('/withdraw', AuthMiddleware.tokenVerification, async (req, res) => {
    const {account_id, amount} = req.body;
    try {
        const account = await prisma.account.findUnique({
            where: { account_id: parseInt(account_id) },
            select: { balance: true }
        });
        if(!account) {
            return res.status(404).json({
                statusCode: 404,
                message: 'Cuenta no encontrada.'
            });
        }
        if(account.balance < amount) {
            return res.status(400).json({
                statusCode: 400,
                message: 'Saldo insuficiente.'
            });
        }
        const updated_account = await prisma.account.update({
            where: { account_id: parseInt(account_id) },
            data: { balance: account.balance - amount }
        });
        res.status(200).json({
            statusCode: 200,
            message: 'Retiro exitoso.',
            data: {
                account: updated_account.account_number,
                balance: updated_account.balance,
            }
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error del servidor.',
            data: { error: error.message }
        });
    }
});

router.post('/transfer', AuthMiddleware.tokenVerification, async (req, res) => {
    const { origin_account_id, destination_account_id, amount } = req.body;

    try {
        const origin_account = await prisma.account.findUnique({
            where: { account_id: parseInt(origin_account_id) },
            select: { balance: true }
        });
        if(!origin_account) {
            return res.status(404).json({
                statusCode: 404,
                message: 'Cuenta de origen no encontrada.'
            });
        }
        if(origin_account.balance < amount) {
            return res.status(400).json({
                statusCode: 400,
                message: 'Saldo insuficiente.'
            });
        }
        const destination_account = await prisma.account.findUnique({
            where: { account_id: parseInt(destination_account_id) },
            select: { balance: true }
        });
        if(!destination_account) {
            return res.status(404).json({
                statusCode: 404,
                message: 'Cuenta de destino no encontrada.'
            });
        }

        await prisma.$transaction([
            prisma.account.update({
                where: { account_id: parseInt(origin_account_id) },
                data: { balance: origin_account.balance - amount }
            }),
            prisma.account.update({
                where: { account_id: parseInt(destination_account_id) },
                data: { balance: destination_account.balance + amount }
            }),
            prisma.transfer.create({
                data: {
                    account_origin_id: parseInt(origin_account_id),
                    account_destination_id: parseInt(destination_account_id),
                    amount,
                    transfer_status: 'S',
                    transfer_date: new Date()
                }
            })
        ]);

        res.status(200).json({
            statusCode: 200,
            message: 'Transferencia exitosa.'
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error del servidor',
            data: { error: error.message }
        });
    }
});

module.exports = router;