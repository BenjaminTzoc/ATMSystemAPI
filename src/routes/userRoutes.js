const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();

//HANDLER PARA AGREGAR UN NUEVO USUARIO - PRIMER PASO REGISTRAR USUARIO
router.post('/add_user', async (req, res) => {
    const { nombreUsuario, contrasena, rolId, correoElectronico, identificacion } = req.body;

    try{
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        //BUSCA COINCIDENCIAS ENTRE IDENTIFICACION DE CLIENTE
        const existingCustomer = await prisma.cliente.findUnique({
            where: { identificacion: identificacion },
            include: { cuentas: true }
        });

        //SI EXISTE UN CLIENTE CON LA MISMA IDENTIFICACION
        if(existingCustomer){
            const newUser = await prisma.usuario.create({
                data: {
                    nombreUsuario,
                    contrasena: hashedPassword,
                    rolId,
                    correoElectronico,
                    telefono,
                    fechaUltimoInicioSesion: new Date(),
                    cliente: {
                        connect: { id: existingCustomer.id }
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
    }catch(ex){
        res.status(500).json({
            statusCode: 500,
            error: ex.message 
        });
    }
});

//HANDLER PARA INSERTAR UN NUEVO USUARIO Y NUEVO CLIENTE A SU VEZ
router.post('/add_user/new_customer', async (req, res) => {
    const {nombreUsuario, contrasena, rolId, correoElectronico, identificacion, fechaUltimoInicioSesion,
            nombre, direccion, telefono, fecha_nacimiento, estado_civil, genero, nacionalidad } = req.body;

    try {
        const newCustomer = await prisma.cliente.create({
            data: {
                nombre,
                direccion,
                telefono,
                email: correoElectronico,
                identificacion,
                fecha_nacimiento: new Date(fecha_nacimiento),
                estado_civil,
                genero,
                nacionalidad
            }
        });

        const newUser = await prisma.usuario.create({
            data: {
                nombreUsuario,
                contrasena,
                rolId,
                correoElectronico,
                fechaUltimoInicioSesion: new Date(now()),
                cliente: {
                    connect: { id: newCustomer.id }
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
    } catch (ex) {
        res.status(500).json({
            statusCode: 500,
            error: ex.message
        });
        
    }
});

//HANDLER PARA INSERTAR SOLAMENTE UN CLIENTE NUEVO
router.post('/new_customer', async (req, res) => {
    const {nombre, direccion, telefono, email, identificacion, fecha_nacimiento, estado_civil, genero, nacionalidad } = req.body;

    try {
        const newCustomer = await prisma.cliente.create({
            data: {
                nombre,
                direccion,
                telefono,
                email,
                identificacion,
                fecha_nacimiento: new Date(fecha_nacimiento),
                estado_civil,
                genero,
                nacionalidad
            }
        });
    
        res.status(201).json({
            statusCode: 200,
            message: 'Cliente agregado exitosamente.',
            data: {
                customer: newCustomer
            }
        });
    } catch (ex) {
        res.status(500).json({
            statusCode: 500,
            message: ex.message
        });
    }
});

module.exports = router;