const mysql = require("mysql2");

const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "12345",
    database: "lostfounddb"
});

connection.connect((err) => {
    if (err) {
        console.log("Database Connection Failed");
    } else {
        console.log("MySQL Connected");
    }
});

module.exports = connection;