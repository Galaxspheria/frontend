var app = require('express')();
var http = require('http').Server(app);
var favicon = require('serve-favicon');
var path = require('path');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

var port = process.env.PORT || 3000;

http.listen(port, function () {
    console.log('listening on *:' + port);
});
