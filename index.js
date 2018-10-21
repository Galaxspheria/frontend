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

app.get('/ai', function (req, res) {
    res.sendFile(__dirname + '/ai.html');
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

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

function cleanName(name) {
    return name.toLowerCase().replace(/ /g, "_");
}

function prettifyParkName(name) {
    return toTitleCase(name.replace(/_/g, ' '));
}

function prettifySpeciesName(name) {
    let lower = name.replace(/_/g, ' ').toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function parseCoords(coordString) {
    var chunks = coordString.split(", ");
    if (chunks.length == 2) {
        return [Number(chunks[1].substr(5)), Number(chunks[0].substr(4))];
    }
}

io.on('connection', function (socket) {
    getURL('https://test-1-220001.appspot.com/get/' + JSON.stringify({ "park_info": "all" }))
    .then((response) => {
        let coordinates = Object.keys(response.output).map(x => parseCoords(response.output[x][0])).filter(x => x);
        socket.emit('update heatmap', coordinates);
        // TODO: sizing on biodiversity
    })

    socket.on('search', function(query) {
        let snakeQuery = cleanName(query);
        getURL('https://test-1-220001.appspot.com/get/' + JSON.stringify({ "species_list": snakeQuery }))
        .then((results) => {
            if (results.includes(snakeQuery)) {
                getURL('https://test-1-220001.appspot.com/get/' + JSON.stringify({ "species": cleanName(snakeQuery) }))
                .then((response) => {
                    if (response.output && Object.keys(response.output) && Object.keys(response.output).length > 0) {
                        let coordinates = Object.keys(response.output).map(x => parseCoords(response.output[x]));
                        socket.emit('update heatmap', coordinates);
                    } else {
                        // TODO: return error/empty data set
                    }
                })
            }
        })
        .catch((err) => {
            console.log(err);
        })

        getURL('https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&utf8=&format=json&srsearch=' + encodeURI(query))
        .then((searchResult) => {
            let pageid = encodeURI(searchResult.query.search[0].pageid);
            getURL('https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages&pithumbsize=150&pageids=' + pageid)
            .then((thumbnailResult) => {
                getURL('https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&format=json&formatversion=2&prop=extracts&exintro=true&pageids=' + pageid)
                .then((contentResult) => {
                    contentResult.query.pages[0].thumbnail = thumbnailResult.query.pages[0].thumbnail
                    socket.emit('wikipedia extract', contentResult.query.pages[0]);
                });
            });
        })
        .catch((err) => {
            console.log(err);
        })
    });

    socket.on('fetch suggestions', function(query) {
        getURL('https://test-1-220001.appspot.com/get/' + JSON.stringify({ "species_list": query }))
        .then((suggestions) => {
            if(suggestions.length > 0) {
                socket.emit('autocomplete results', suggestions.map(x => prettifySpeciesName(x)));
            }
        })
        .catch((err) => {
            console.log(err);
        })
    });

    socket.on('ai query', function(query) {
        getURL('https://test-1-220001.appspot.com/get/' + JSON.stringify({ "park_info_ml": cleanName(query) }))
        .then((aiResult) => {
            getURL('https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&utf8=&format=json&srsearch=' + encodeURI(prettifyParkName(aiResult.output)))
            .then((searchResult) => {
                let pageid = encodeURI(searchResult.query.search[0].pageid);
                getURL('https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages&pithumbsize=300&pageids=' + pageid)
                .then((thumbnailResult) => {
                    socket.emit('ai result', [prettifyParkName(aiResult.output), thumbnailResult.query.pages[0].thumbnail]);
                });
            })
        })
        .catch((err) => {
            console.log(err);
        })
    });
});