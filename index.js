var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var https = require('https');
var favicon = require('serve-favicon');
var path = require('path');
var io = require('socket.io')(http);

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

var port = process.env.PORT || 3000;

http.listen(port, function () {
    console.log('listening on *:' + port);
});

function getURL(url) {
    return (
        new Promise((resolve, reject) => {
            https.get(url, (resp) => {
                let data = '';
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                resp.on('end', () => {
                    resolve(JSON.parse(data));
                });
            }).on("error", (err) => {
                console.log("Error: " + err.message);
                reject();
            });
        })
    )
};

io.on('connection', function (socket) {
    console.log('user connected');
    getURL('INSERTURL')
    .then((result) => {
        console.log(result);
    })
});