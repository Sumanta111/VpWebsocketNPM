/* eslint-disable */

var JSON = require('circular-json');

Storage.prototype.setObject = function (key, value) {
    this.setItem(key, JSON.stringify(value));
  };
Storage.prototype.getObject = function (key) {
    let value = this.getItem(key);
    return value && JSON.parse(value);
  };
  

export const shared = {

    setAuthUser: (data,password) => {
        localStorage.setObject("authorized_user", JSON.stringify(data));
        localStorage.setObject("user_name",data.username);
        localStorage.setObject("user_password",password);
    },

    removeAuthUser : () => {
        localStorage.removeItem("authorized_user");
    },

    getAuthUser: () => {
        return localStorage.getObject("authorized_user");
    },

    getUserName: () => {
        return localStorage.getObject("user_name");
    },
    getPassword: () => {
        return localStorage.getObject("user_password");
    },
    isLoggedIn: function() {
        debugger;
        if(this.getAuthUser()){
            return true;
        }else{
            return false;
        }
    },

    socketTimeout:() => {
        localStorage.setObject("socketTimeout", true);
    },
    getSocketTimeout:() => {
        localStorage.getObject("socketTimeout");
    },
    removeSocketTimeout:() => {
        localStorage.removeItem("socketTimeout");
    }
}
