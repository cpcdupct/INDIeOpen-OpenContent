const axios = require('axios');
const qs = require('qs');
const fs = require('fs')

const dataToken = qs.stringify({
    'username': my_username,
    'password': my_password,
    'grant_type': 'password' 
});

const configToken = {
  method: 'post',
  url: my_backend_url,
  headers: { 
    'Authorization': my_app_password, 
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  data : dataToken
};

const formatDate = (date) =>{
    let formatted_date = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDay() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    return formatted_date;
};

let that = null;

class BackEnd{
    constructor(){
        this.token = null;
        this.refreshToken = null;
    }

    async getNewToken(){
        return await axios(configToken);
    }

    async getRefreshToken(){
        let configRefreshToken = {
            method: 'post',
            url: my_backend_url,
            headers: { 
              'Authorization': my_app_password, 
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            data : qs.stringify({
                'grant_type': 'refresh_token',
                'refresh_token': this.refreshToken
            })
          };
        
        return await axios(configRefreshToken)
    }

    async checkToken(){
        if (this.token==null){
            return await this.getNewToken();
       }else{
            let apiClaims = this.token.split('.');
            let api = JSON.parse(Buffer.from(apiClaims[1],'base64'));
            let apiExpiration = new Date(api['exp']*1000);
            let now = new Date();
            if (apiExpiration < now){
                let refreshClaims = this.refreshToken.split('.');
                let refresh = JSON.parse(Buffer.from(refreshClaims[1],'base64'));
                let refreshExpiration = new Date(refresh['exp']*1000);
                if (refreshExpiration > now){
                    return await this.getRefreshToken();
                }else{
                    return await this.getNewToken();
                }
            }else{
                return true;
            }
        }
    }

    

    sendEvent(ip, url, domain, title, course){
        this.checkToken()
            .then((res) =>{
                if (res!=true){
                    this.token = res.data.access_token;
                    this.refreshToken = res.data.refresh_token;
                }
                let data = JSON.stringify({"user": ip, "url": url, "domain": domain, "title": title, "date": formatDate(new Date()), "profile":"Student", "timestamp": (Date.now()/1000).toString(), "percentage":"100", "type" : "LoggedIn", "element": "", "notes":"","description":"", "unit_type": "Opencontent", "course": course});
                let config = {
                    method: 'post',
                    url: my_backend_url,
                    headers: { 
                        'Authorization': 'Bearer ' + this.token, 
                        'Content-Type': 'application/json'
                    },
                    data : data
                };
                axios(config)
                .then(function (response) {
                    fs.writeFileSync(__dirname + '/../public' + url + 'la.json', JSON.stringify(response.data), function (err) {
                        if (err) throw err;
                    })
                })
                .catch(function (error) {
                    console.log(error);
                });
            })
            .catch((err)=>console.log(err))
    }

    getLAGeneral(){
        this.checkToken()
            .then((res) =>{
                if (res!=true){
                    this.token = res.data.access_token;
                    this.refreshToken = res.data.refresh_token;
                }
                let data = '';
                let config = {
                    method: 'get',
                    url: my_backendla_url,
                    headers: { 
                        'Authorization': 'Bearer ' + this.token
                    },
                    data : data
                };
                axios(config)
                .then(function (response) {
                    fs.writeFileSync(__dirname + '/../public/la/data/la.json', JSON.stringify(response.data), function (err) {
                        if (err) throw err;
                    })
                })
                .catch(function (error) {
                    console.log(error);
                });
            })
            .catch((err)=>console.log(err))
    }
}

module.exports = BackEnd;