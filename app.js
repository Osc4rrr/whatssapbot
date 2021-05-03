const fs = require('fs'); 
const exceljs = require('exceljs'); 
const express = require('express'); 
const cors = require('cors'); 
const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal'); 
const ora = require('ora');
const chalk = require('chalk');
const moment = require('moment');
const bodyParser = require('body-parser');
const app = express(); 

const SESSION_FILE_PATH ='./session.json'; 
let client; 
let sessionData; 



app.use(cors()); 
app.use(
    bodyParser.json()
); 

app.use(
    bodyParser.urlencoded()
)

const sendWithApi = (req,res) => {
    const {message, to} = req.body; 

    const newNumber=`${to}@c.us`; 
    console.log(message, to); 

    sendMessage(newNumber, message); 
    res.send({status: 'enviado'});     
}

app.post('/send', sendWithApi); 



const withSession = () => {
    //si existe, cargamos el archivo con las credenciales

    const spinner = ora(`Cargando ${chalk.yellow('Validando sesion con whatssap')}`); 
    sessionData = require(SESSION_FILE_PATH); 
    spinner.start(); 
    client = new Client({
        session: sessionData
    }); 

    client.on('ready', ()  => {
        console.log('cliente is ready'); 
        spinner.stop(); 

        linstenMessage(); 
    }); 

    client.on('auth_failure', () => {
        spinner.stop(); 
        console.log('Error autenticacion, borra el session.json'); 
    }); 

    client.initialize(); 
}

//Esta fn genera el qr code
const withoutSession = () => {
    console.log("no hay sesion guardada"); 
    client = new Client(); 

    client.on('qr',qr => {
        qrcode.generate(qr, {small: true}); 
    }); 

    client.on('authenticated', (session) => {
        //guardamos credenciales de seesion 
        sessionData = session; 

        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) =>  {
            if(err){
                console.log(err); 
            }
        }); 
    }); 

    client.initialize();
}

//esta funcion escucha cada vez que un mensaje nuevo entra
const linstenMessage = () => {
    client.on('message', (msg) => {
        const {from, to, body} = msg;
        
        switch(body){
            case 'quiero_info': 
                sendMessage(from, 'De que quieres saber info?'); 
                break; 
            case 'adios': 
                sendMessage(from, 'Nos vemos pronto!, vuelve a escribirnos por cualquier duda'); 
                break; 
            case 'media': 
                sendMessage(from, 'bienvenido'); 
                sendMedia(from, 'js.png'); 
                break; 
        }

        saveHistorial(from, body); 

        console.log(`${chalk.yellow(body)}`); 
    });     
}

const sendMedia = (to, file) => {
    const mediaFile = MessageMedia.fromFilePath(`./mediaSend/${file}`); 
    client.sendMessage(to,mediaFile ); 
}


const sendMessage = (to, message) => {
    client.sendMessage(to, message); 
}

const saveHistorial = (numero, message) => {
    const pathChat = `./chats/${numero}.xlsx`; 
    const workbook = new exceljs.Workbook(); 

    const today = moment().format('DD-MM-YYYY hh:mm'); 

    if(fs.existsSync(pathChat)){
        workbook.xlsx.readFile(pathChat)
        .then( () => {
            const worksheet = workbook.getWorksheet(1); 
            const lastRow = worksheet.lastRow; 
            let getRowInsert = worksheet.getRow(++(lastRow.number)); 
            getRowInsert.getCell('A').value = today; 
            getRowInsert.getCell('B').value = message; 
            getRowInsert.commit(); 

            workbook.xlsx.writeFile(pathChat) 
            .then(() => {
                console.log('Se agrego chat'); 
            })
            .catch(() => {
                console.log('Algo ocurrio guardando el chat'); 
            })
        }); 
    }else{
        //creamos
        const worksheet = workbook.addWorksheet('Chats'); 
        worksheet.columns = [
            {header: 'Fecha', key:'date'}, 
            {header: 'Mensaje', key: 'message'}
        ]

        worksheet.addRow([today, message]);  
        workbook.xlsx.writeFile(pathChat)
        .then(() => {
            console.log('historial creado'); 
        })
        .catch(() => {
            console.log('Algo fallo'); 
        })
    }
}



(fs.existsSync(SESSION_FILE_PATH)) ? withSession() : withoutSession(); 


app.listen(9000, () => {
    console.log('api esta rriba'); 
})
