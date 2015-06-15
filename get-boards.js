var Trello = require("node-trello");
var config = require('./config');

var trello = new Trello(config.key, config.token);

trello.get('/1/members/my/boards', function (error, boardsJSON) {
  boardsJSON.forEach(function (board) {
    console.log(board.name + ' ID: ' + board.id);
  });
});
