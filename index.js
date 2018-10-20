var app = require('express')();
var http = require('http').Server(app);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

var port = process.env.PORT || 3000;

http.listen(port, function () {
    console.log('listening on *:' + port);
});
