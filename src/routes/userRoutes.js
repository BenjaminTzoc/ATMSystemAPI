const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

//HANDLER PARA AGREGAR UN NUEVO USUARIO - PRIMER PASO REGISTRAR USUARIO
router.post('/add_user', async (req, res) => {
    const { user_name, password, role_id, email, identification } = req.body;

    try{
        const hashedPassword = await bcrypt.hash(password, 10);
        //BUSCA COINCIDENCIAS ENTRE IDENTIFICACION DE CLIENTE
        const existingCustomer = await prisma.customer.findUnique({
            where: { identification: identification },
            include: { accounts: true }
        });

        //SI EXISTE UN CLIENTE CON LA MISMA IDENTIFICACION
        if(existingCustomer){
            const newUser = await prisma.user.create({
                data: {
                    user_name,
                    password: hashedPassword,
                    role_id,
                    email,
                    last_login: new Date(),
                    customer: {
                        connect: { customer_id: existingCustomer.customer_id }
                    }
                }
            });
            //REGISTRA EL USUARIO Y CONECTA EL CLIENTE
            res.status(201).json({
                statusCode: 200,
                message: 'Usuario registrado exitosamente.',
                data: {
                    requestCustomerData: false,
                    user: newUser,
                    customer: existingCustomer
                }
            });
        }else{  //SI NINGUNA IDENTIFICACION COINCIDE, SE SOLICITA INGRESE LOS DATOS DEL CLIENTE
            res.status(401).json({
                statusCode: 401,
                message: 'Cliente no encontrado. Por favor, proporcione los datos para registrarse.',
                data: {
                    requestCustomerData: true
                }
            });
        }
    }catch(error){
        res.status(500).json({
            statusCode: 500,
            message: 'Error del servidor',
            data:{
              error: error.message
            }
        });
    }
});

//HANDLER PARA INSERTAR UN NUEVO USUARIO Y NUEVO CLIENTE A SU VEZ
router.post('/add_user/new_customer', async (req, res) => {
    const {user_name, password, role_id, email, identification,
            name, address, telephone, birthdate, civil_status, gender, nationality } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newCustomer = await prisma.customer.create({
            data: {
                name,
                address,
                telephone,
                email,
                identification,
                birthdate: new Date(birthdate),
                civil_status,
                gender,
                nationality
            }
        });

        const newUser = await prisma.user.create({
            data: {
                user_name,
                password: hashedPassword,
                role_id,
                email,
                last_login: new Date(),
                customer: {
                    connect: { customer_id: newCustomer.customer_id }
                }
            }
        });

        res.status(201).json({
            statusCode: 200,
            message: 'Usuario y cliente registrados exitosamente.',
            data: {
                user: newUser,
                customer: newCustomer
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

//HANDLER PARA INSERTAR SOLAMENTE UN CLIENTE NUEVO
router.post('/new_customer', async (req, res) => {
    const {name, address, telephone, email, identification, birthdate, civil_status, gender, nationality } = req.body;

    try {
        const newCustomer = await prisma.customer.create({
            data: {
                name,
                address,
                telephone,
                email,
                identification,
                birthdate: new Date(birthdate),
                civil_status,
                gender,
                nationality
            }
        });
    
        res.status(201).json({
            statusCode: 200,
            message: 'Cliente agregado exitosamente.',
            data: {
                customer: newCustomer
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