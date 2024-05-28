const express = require('express');
const { PrismaClient } = require('@prisma/client');
const AuthMiddleware = require('../authMiddleware');

const prisma = new PrismaClient();
const router = express.Router();

router.get('/get_balance', AuthMiddleware.tokenVerification, async (req, res) => {
    const { account_id } = req.query;

    try {
        const account = prisma.account.findUnique({
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