
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const BackEnd = require('./token');
const backend = new BackEnd();
const path = require('path');
const forge = require('node-forge');
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const axios = require('axios');


const createGame= async(idunidad,idwidget,origin,token) => {
    var data = JSON.stringify({
        "idunidad": idunidad,
        "idwidget": idwidget,
        "origin": origin
    });
      
    var config = {
        method: 'post',
        url: my_backendgame_url,
        headers: { 
          'Authorization': 'Bearer ' + token, 
          'Content-Type': 'application/json'
        },
        data : data
    };
      
    let dataR = await axios(config)
      .then(function (response) {
        return response.data;
      })
      .catch(function (error) {
        if (error.response) {
            return error.response.status;
        }
    });
    return dataR;
}

function isVersionGame(data){
    const pattern = /Platform version (\d).(\d).?(\d)?/;
    const version = data.match(pattern);
    const finalVersion = version[1]*10 + version[2];

    if (version != null){
        if (finalVersion >= 23){
            return true;
        }else{
            return false;
        }
    }else{
        return false;
    }
}
function addGame(data){
    const pattern = /(<(div|span) id="(game\w*)" data-widget="(\w*)" data-origin="(\w*)"><\/(div|span)>)/g;
    if (data.match(pattern) != null){
        data = data.replace(pattern, "<button id=\"$3\" onclick=\"startGame('$4', '$5')\" type=\"button\" class=\"btn btn-default visto\" aria-label=\"Right Align\"><i class=\"fas fa-gamepad fa-2x\" aria-hidden=\"true\"></i></button>");
    }
    const pattern2 = /(<script\s+(type=\"text\/javascript\"\s+)?src=\"..\/..\/gamification\/game.js\"><\/script>)/;
    if (data.match(pattern2) != null){
        data = data.replace(pattern2, 
        "<script>"+
        "function startGame(idwidget,origin){"+	
            "$.ajax({"+
                "method: \"POST\","+
                "url: \"/game/\","+
                "xhrFields: { withCredentials: true },"+
                "data: JSON.stringify({idunidad: idunit, idwidget: idwidget, origin: origin}),"+									
                "timeout: 0,"+
                "headers: {"+
                    "\"Content-Type\": \"application/json\""+
                "},"+
                "error:function(e){"+
                    "console.log('error');"+
                    "document.getElementById('bodymymodal').innerHTML =\"Sesión caducada\";"+
                    "$('#myModal').modal('show');"+
                "},"+
                "success: function(dataOut){"+
                    "const urlGame = \"https://my_game_url/\" + dataOut.codgame + \"/teacher/\";"+
                    "location.replace(urlGame);"+
                "},"+
            "});"+
        "}"+
        "</script>");
    }
    return data;
}

function decrypt(encryptedString){
    const decipher = forge.cipher.createDecipher('my_algorithm', my_key);
    const decodedB64 = forge.util.decode64(encryptedString);
    decipher.start({ iv: my_iv });
    decipher.update(forge.util.createBuffer(decodedB64));
    decipher.finish();
    return decipher.output.data;
};


const parseTitle = (body) => {
    if (body!=null){
        let match = body.match(/<title>([^<]*)<\/title>/) // regular expression to parse contents of the <title> tag
        if (!match || typeof match[1] !== 'string')
        throw new Error('Unable to parse the title tag')
        return match[1]
    }else{
        return "Sin título"
    }
}
const parseURL = (url) => {
    return url.split("/")[2];
}

const corsOptions = {
    origin: 'http://my_opencontent_url',
    optionsSuccessStatus: 200 
  }

class Server{
    constructor(){
        this.app = express();
        this.port = process.env.PORT;
        this.middlewares();

    }

    middlewares(){      

        this.app.use(cors(corsOptions))
        this.app.use(cookieParser());
        this.app.set('trust proxy', true)
        this.app.use(express.json());
       

        this.app.get(/\/.{32}\/.{32}\/$/,function(req, res) {
            fs.readFile(path.join(__dirname, '..', '/public', req.originalUrl,'index.html'), 'utf8' , (err, data) => {
                if (err) {
                    res.sendStatus(404);
                } else {
                    if (isVersionGame(data)){
                        const tokencipher = req.cookies.my_cookie;
                        if ((tokencipher !== null)&&(tokencipher!== undefined)){
                            try{
                                const token = decrypt(tokencipher);
                                const tokenJSON = JSON.parse(token);
                                const dataToken  = jwt.verify(tokenJSON.access_token, my_secret_key);
                                data = addGame(data);
                            }catch(error){
                                console.log(error);
                                console.log("Detectada cookie pero con un token no valido");
                            }
                        }
                    }
                    //Obtenemos la dirección IP para LA
                    let ip = req.ip;
                    if (ip.substring(0, 7) == "::ffff:") {
                        ip = ip.substring(7)
                    }
                    //Envíamos el evento de visita a la página para LA
                    backend.sendEvent(ip, req.path, "my_open_url", parseTitle(data), parseURL(req.path));
                    res.send(data);
                }
            })
        });

        this.app.get(/\/la\/general\//,function(req, res, next) {
            backend.getLAGeneral();
            next();
        });

        this.app.post(/\/game\/$/,function(req, res) {
            const tokencipher = req.cookies.my_cookie;
            if ((tokencipher !== null)&&(tokencipher!== undefined)){
              
                    try{
                        const token = decrypt(tokencipher);
                        const tokenJSON = JSON.parse(token);
                        const dataToken  = jwt.verify(tokenJSON.access_token, my_secret_key);
                        const { idunidad, idwidget, origin} = req.body;
                        createGame(idunidad,idwidget,origin,tokenJSON.access_token)
                            .then( msg => res.status(201).send(msg))
                            .catch( err => res.status(401).send("ERROR: No se puede crear el juego"));
    
                    }catch(error){
                        res.status(401);
                        console.log(error);
                        console.log("Detectada cookie pero con un token no valido");
                    }
              
            }else{
                res.status(401);
            }
        });

        //Directorio público
        this.app.use(express.static('public'));

        this.app.use(function(req, res, next) {
            res.sendFile(path.join(__dirname, '..', '/public/error/index.html'))
        });

    }

    routes(){
      
    }

    listen(){
        this.app.listen( process.env.PORT || 3000, () => 
        {
            console.log('Servidor en', process.env.PORT || 3000);
        });
    }
}
module.exports = Server;