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

        res.status(200).json({
            statusCode: 200,
            message: 'Tarjeta verificada exitosamente.',
            data: {
              card_number: card.card_number,
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

        const isPinValid = await bcrypt.compare(pin, card.card_pin);
        if(!isPinValid){
            return res.status(401).json({
                statusCode: 401,
                message: 'PIN incorrecto.'
            });
        }

        const token = jwt.sign(
            {
                user_id: card.account.customer.user.user_id,
                customer_id: card.account.customer.customer_id,
                card_id: card.card_id,
                account_id: card.account.account_id
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

router.get('/get_user_data', AuthMiddleware.tokenVerification, async (req, res) => {
    try {
        const user_id = req.user_id;

        const user = await prisma.user.findUnique({
            where: { user_id: user_id },
            include: {
                customer: {
                    include: {
                        accounts: {
                            include: {
                                cards: true
                            }
                        }
                    }
                }
            }
        });

        if(!user || !user.customer) {
            return res.status(404).json({
                statusCode: 404,
                message: 'Cliente no encontrado.'
            });
        }

        const customerData = {
            user_name: user.user_name,
            email: user.email,
            customer: {
                name: user.customer.name,
                address: user.customer.address,
                telephone: user.customer.telephone,
                email: user.customer.email,
                identification: user.customer.identification,
                birthdate: user.customer.birthdate,
                civil_status: user.customer.civil_status,
                gender: user.customer.gender,
                nationality: user.customer.accounts[0].ca,
            },
            account: user.customer.accounts.map(account => ({
                account_id: account.account_id,
                account_number: account.account_number,
                balance: account.balance,
                cards: account.cards.map(card => ({
                    card_id: card.card_id,
                    card_number: card.card_number,
                    card_type: card.card_type,
                    expiration_date: card.expiration_date,
                    card_status: card.card_status
                }))
            }))
        };

        res.status(200).json({
            statusCode: 200,
            message: 'Datos del cliente obtenidos exitosamente.',
            data: customerData
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error del servidor',
            error: error.message,
        });
    }
});

router.post('/get_account_card', async (req, res) => {
    try {
        const { card_number } = req.body;

        if (!card_number) {
            return res.status(400).json({ error: 'Card number is required' });
        }

        const card = await prisma.card.findUnique({
            where: { card_number: card_number },
            include: { account: true },
        });

        if (!card) {
            return res.status(404).json({
                statusCode: 404,
                message: 'Tarjeta no encontrada.'
            });
        }

        res.status(200).json({
            statusCode: 200,
            message: 'Tarjeta encontrada.',
            card: {
                card_number: card.card_number,
                card_type: card.card_type,
                expiration_date: card.expiration_date,
                card_status: card.card_status,
            },
            account: card.account,
        });
    } catch (error) {
        res.status(500).json({ 
            statusCode: 500,    
            error: 'Server error', details: error.message });
    }   
});

router.get('/get_balance', AuthMiddleware.tokenVerification, async (req, res) => {
    const account_id = req.account_id;

    try {
        const account = await prisma.account.findUnique({
            where: { account_id: account_id },
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

router.post('/transfer', async(req, res) => {
    const { account_origin_id, account_destination_id, amount, authorization_user_id, description } = req.body;

    try{
        const result = await prisma.$transaction(async (prisma) => {
            const origin_account = await prisma.account.findUnique({
               where: { account_id: account_origin_id } 
            });

            const dest_account = await prisma.account.findUnique({
                where: { account_id: account_destination_id }
            });

            if(!origin_account){
                return res.status(404).json({
                    statusCode: 404,
                    message: 'Cuenta de origen no encontrada.'
                });
            }
            if(!dest_account){
                return res.status(404).json({
                    statusCode: 404,
                    message: 'Cuenta de origen no encontrada.'
                });
            }

            const accountOrigin = await prisma.account.update({
                where: { account_id: account_origin_id },
                data: { balance: { decrement: amount } }
            });

            const accountDest = await prisma.account.update({
                where: { account_id: account_destination_id },
                data: { balance: { increment: amount } }
            });

            const transfer = await prisma.transfer.create({
                data: {
                    account_origin_id: account_origin_id,
                    account_destination_id: account_destination_id,
                    amount: amount,
                    transfer_status: 'P',
                    authorization_user_id: authorization_user_id,
                    description: description,
                    transfer_date: new Date()
                }
            });

            return res.status(200).json({
                statusCode: 200,
                message: 'Transferencia realizada exitosamente.',
                data: { 
                    transfer,
                    accountOrigin,
                    accountDest
                }
            });
        });

        result;
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            message: 'Error del servidor'
        });
    }
});

router.post('/pay_service', AuthMiddleware.tokenVerification, async (req, res) => {
    try {
        const { account_number, service_type_id, amount, reference } = req.body;

        if (!account_number || !service_type_id || !amount) {
            return res.status(400).json({ error: 'Account Number, Service Type ID, and Amount are required' });
        }

        const account = await prisma.account.findUnique({
            where: { account_number: account_number },
            include: { customer: true }
        });

        if (!account) {
            return res.status(404).json({ error: 'Cuenta no encontrada.' });
        }

        const serviceType = await prisma.serviceType.findUnique({
            where: { service_type_id: service_type_id }
        });

        if (!serviceType) {
            return res.status(404).json({ error: 'Tipo de servicio no encontrado.' });
        }

        if (account.balance < amount) {
            return res.status(400).json({ error: 'Saldo insuficiente.' });
        }

        const updatedAccount = await prisma.account.update({
            where: { account_id: account.account_id },
            data: { balance: account.balance - amount }
        });

        const serviceBalance = await prisma.serviceBalance.findFirst({
            where: { customer_id: account.customer.customer_id, service_type_id: service_type_id }
        });

        if (!serviceBalance) {
            return res.status(404).json({ error: 'Servicio no encontrado.' });
        }

        const updatedServiceBalance = await prisma.serviceBalance.update({
            where: { service_balance_id: serviceBalance.service_balance_id },
            data: { balance: serviceBalance.balance + amount, updated_date: new Date() }
        });

        const paymentService = await prisma.paymentService.create({
            data: {
                account_id: account.account_id,
                service_type_id: service_type_id,
                amount: amount,
                reference: reference,
                status: 'P',
                payment_date: new Date(),
                service_balance_id: updatedServiceBalance.service_balance_id
            }
        });

        res.status(201).json({
            statusCode: 200,
            message: 'Pago realizado exitosamente.',
            paymentService,
            updatedAccount
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error del servidor',
            data: { error: error.message }
        });
    }
});

router.post('/check_balance_service', AuthMiddleware.tokenVerification, async (req, res) => {
    const customer_id = req.customer_id;
    try {
        const { service_type_id } = req.body;

        if (!customer_id || !service_type_id) {
            return res.status(400).json({ error: 'Customer ID and Service Type ID are required' });
        }

        const customer = await prisma.customer.findUnique({
            where: { customer_id: customer_id }
        });
        if (!customer) {
            return res.status(404).json({ error: 'Cliente no encontrado.' });
        }

        const serviceType = await prisma.serviceType.findUnique({
            where: { service_type_id: service_type_id }
        });
        if (!serviceType) {
            return res.status(404).json({ error: 'Tipo de servicio no encontrado.' });
        }

        const serviceBalance = await prisma.serviceBalance.findFirst({
            where: {
                customer_id: customer_id,
                service_type_id: service_type_id
            }
        });

        if (!serviceBalance) {
            return res.status(404).json({ error: 'Servicio no afiliado.' });
        }

        res.status(200).json({
            customer_id: customer_id,
            service_type_id: service_type_id,
            service_info: serviceBalance
        });
    } catch(error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error del servidor',
            data: { error: error.message }
        });
    }
});

router.post('/consume_service', async (req, res) => {
    try {
        const { card_number, service_type_id, amount } = req.body;

        if (!card_number || !service_type_id || !amount) {
            return res.status(400).json({ error: 'Card number, Service Type ID, and Amount are required' });
        }

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

        if (!card) {
            return res.status(404).json({ 
                statusCode: 404,
                error: 'Tarjeta no encontrada.' 
            });
        }

        const serviceBalance = await prisma.serviceBalance.findFirst({
            where: {
                customer_id: card.account.customer.customer_id,
                service_type_id: service_type_id
            }
        });

        if (!serviceBalance) {
            return res.status(404).json({ 
                statusCode: 404,
                error: 'Balance del servicio no encontrado.'
            });
        }

        if (serviceBalance.balance < amount) {
            return res.status(400).json({ 
                statusCode: 400,
                error: 'Saldo insuficiente.' 
            });
        }

        const updatedServiceBalance = await prisma.serviceBalance.update({
            where: { service_balance_id: serviceBalance.service_balance_id },
            data: { balance: serviceBalance.balance - amount, updated_date: new Date() }
        });

        res.status(201).json({
            statusCode: 200,
            message: 'Saldo debitado exitosamente.',
            updatedServiceBalance,
        });
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            message: 'Error del servidor',
            data: { error: error.message }
        });
    }
});

router.get('/get_accounts', AuthMiddleware.tokenVerification, async (req, res) => {
    const user_id = req.user_id

    try {
        const customer = await prisma.customer.findUnique({
            where: { user_id: user_id },
            include: {
                accounts: {
                    include: {
                        account_type: true,
                        cards: true
                    }
                }
            }
        });

        if(!customer){
            return res.status(404).json({
                statusCode: 404,
                message: 'Cliente no encontrado.'
            });
        }

        const account = customer.accounts.map(account => ({
            account_id: account.account_id,
            account_number: account.account_number,
            balance: account.balance,
            account_type: account.account_type.description,
            account_status: account.account_status,
            credit_limit: account.credit_limit,
            opening_date: account.opening_date,
            closing_date: account.closing_date,
            cards: account.cards.map(card => ({
                cardNumber: card.card_number,
                cardType: card.card_type,
                expirationDate: card.expiration_date,
                cardStatus: card.card_status,
            })),
        }));

        res.status(200).json({
            statusCode: 200,
            message: 'Consulta de cuentas exitosa.',
            data: { account }
        })
    } catch (error) {
        return res.status(500).json({
            statusCode: 500,
            message: 'Error del servidor',
            data: { error: error.message }
        });
    }
});

module.exports = router;