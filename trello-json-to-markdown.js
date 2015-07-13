var fs = require('fs');
var Trello = require("node-trello");
var config = require('./config');

var trello = new Trello(config.key, config.token);

var hr = '___';
var h1 = '#';
var h3 = '###';
var h4 = '####';
var h5 = '#####';
var h6 = '######';
var br = '\n';
var tab = '&nbsp;&nbsp;&nbsp;&nbsp;';

var currentWaitTime = 0;
var DELTA_WAIT_TIME = 150; //Wait 150 milliseconds between request so we're not attacking Trello's API

var numDays = process.argv[2];

//So we can limit the amount of cards we retrieve, we'll need to store the end date
var endDate = new Date();
endDate.setDate(endDate.getDate() - numDays);

//Make sure numDays is a number >= 1
if (numDays && !isNaN(numDays) && numDays > 0) {
  createMarkdowns();
} else {
  console.log('Number of days to search must be a positive number greater than 0.');
  console.log('Usage: node trello-json-to-markdown.js \<number_of_days_to_search\>');
}

/**
 * This will generate the markdown files for each board and
 * cards within each board
 *
 */
function createMarkdowns() {

  config.boards.forEach(function (boardId) {
    trello.get('/1/boards/' + boardId + '?cards=all&lists=all&members=all&member_fields=all&checklists=all&fields=all', function (error, boardJSON) {
      if (error) {
        console.log(error);
      }
      var boardName = boardJSON.name;
      if (boardName) {

        var boardShortUrl = boardJSON.shortUrl;
        var cards = boardJSON.cards;

        var boardDirectory = boardName + '/';
        var cardDirectory = boardName + '-cards/';
        //Full card ID = boardName-cardNumber
        var cardPrefix = boardName + '-';
        var tableOfContentsFile = boardDirectory + boardName + '.md';

        //Set the title of the table of contents the the board name (and link the board name to the board)
        var tableOfContents = h1 + '[' + boardName + '](' + boardShortUrl + ')' + br;

        //Make the card and board directory if they does not already exist
        if (!fs.existsSync(boardDirectory)) {
          fs.mkdirSync(boardDirectory);
        }

        if (!fs.existsSync(boardDirectory + cardDirectory)) {
          fs.mkdirSync(boardDirectory + cardDirectory);
        }

        //Sort cards based on the most recent activity
        //We're sorting in reversed order since later dates are 'larger'
        //so they will be put in later into the array if not sorted in reverse
        cards.sort(function (card1, card2) {
          return Date.parse(card2.dateLastActivity) - Date.parse(card1.dateLastActivity);
        });

        cards.forEach(function (card) {
          var idShort = card.idShort;
          var cardFullId = cardPrefix + idShort;
          var cardFilePath = cardDirectory + cardFullId + '.md';
          var name = card.name;

          //Add the card to the table of contents and link the card to the card's markdown file
          tableOfContents += h3 + '[Card #' + idShort + '](' + cardFilePath + ')' + br;
          tableOfContents += '[' + cardFullId + '](' + cardFilePath + ')' + br;
          tableOfContents += h6 + name + br;
          tableOfContents += '*Last Modified: ' + (new Date(card.dateLastActivity)).toUTCString() + '*' + br;
          tableOfContents += hr + br;
        });

        cards = cards.filter(function (card) {
          return Date.parse(card.dateLastActivity) >= endDate;
        });

        cards.forEach(function (card) {
          setTimeout(function () {
            createCardMarkdown(card, cardPrefix, cardDirectory, boardDirectory, true);
          }, currentWaitTime);
          currentWaitTime += DELTA_WAIT_TIME;
        });

        //Write the table of contents to its markdown file
        fs.writeFileSync(tableOfContentsFile, tableOfContents);
      }
    });
  });
}

function createCardMarkdown(card, cardPrefix, cardDirectory, boardDirectory, retry) {
  var id = card.id;
  trello.get('/1/card/' + id + '?actions=all&actions_limit=1000&members=true&member_fields=all&checklists=all&checklist_fields=all&attachments=true', function (error, cardJSON) {
    if (error) {
      if (retry) {
        console.log('An error has occurred when gathering actions for ' + cardPrefix + card.idShort);
        console.log('Retrying to get the actions now...');
        createCardMarkdown(card, cardPrefix, cardDirectory, boardDirectory, false);
      } else {
        console.log('Requesting ' + cardPrefix + card.idShort + ' failed again.');
        console.log('It will not be requested again.');
      }
    } else {
      var actions = cardJSON.actions;
      var members = cardJSON.members;
      var checkLists = cardJSON.checklists;

      var idShort = card.idShort;
      var cardFullId = cardPrefix + idShort;
      var cardFilePath = cardDirectory + cardFullId + '.md';
      var name = card.name;

      console.log('Successful request for ' + cardPrefix + idShort);

      //----------------CARD MARKDOWN----------------

      //Set the short id of the card as the title of the markdown file
      var cardMd = h1 + ' #' + idShort + br;

      var shortUrl = card.shortUrl;
      var cardLabels = card.labels;
      var description = card.desc;

      //Set the full card id as the subtitle
      cardMd += h3 + cardFullId + br;

      //----------------Name----------------

      cardMd += h4 + tab + 'Name' + br;
      if (name.length <= 0) {
        cardMd += tab + tab + '[no name]' + br;
      } else {
        cardMd += tab + tab + name + br;
      }

      //----------------END NAME----------------

      //----------------DESCRIPTION----------------

      //If there is no description, we just won't display the field
      if (description.length > 0) {
        cardMd += h4 + tab + 'Description' + br;
        cardMd += tab + tab + description + br;
      }

      //----------------END DESCRIPTION----------------

      //----------------MEMBERS----------------

      cardMd += h4 + tab + 'Members' + br;
      if (members.length <= 0) {
        cardMd += tab + tab + '[no members]' + br;
      } else {
        members.forEach(function (member) {
          cardMd += '* ' + member.fullName + br;
        });
      }

      //----------------END MEMBERS----------------

      //----------------LABELS----------------

      cardMd += br + h4 + tab + 'Labels' + br;
      if (cardLabels.length <= 0) {
        cardMd += tab + tab + '[no labels]' + br;
      } else {
        cardLabels.forEach(function (label) {
          var labelName = label.name;
          if (labelName.length <= 0) {
            //If the label has an empty name, we'll set the name
            //to [unnamed label] within the markdown to show that
            //there is still labels associated with the card
            labelName = '[unnamed label]';
          }
          cardMd += '* ' + labelName + br;
        });
      }

      //----------------END LABELS----------------

      //----------------CHECKLISTS----------------

      if (checkLists.length > 0) {
        cardMd += br + h4 + tab + 'Checklists' + br;
        checkLists.forEach(function (list) {
          cardMd += h5 + tab + tab + list.name + br;
          list.checkItems.forEach(function (item) {
            cardMd += '- [';

            if (item.state === 'complete') {
              cardMd += 'x] ' + item.name;
            } else {
              cardMd += ' ] ' + item.name;
            }

            cardMd += br;
          });
        });
      }

      //----------------END CHECKLISTS----------------

      //----------------COMMENTS----------------

      cardMd += br + h4 + tab + 'Comments' + br;
      var commentActions = actions.filter(function (action) {
        if (action.type === 'commentCard') {
          return action;
        }
      });
      if (commentActions.length <= 0) {
        cardMd += tab + tab + '[no comments]' + br;
      } else {
        commentActions.forEach(function (action) {
          var commentUserFullName = action.memberCreator.fullName;
          var date = (new Date(action.date)).toUTCString();
          var content = action.data.text;
          cardMd += h5 + tab + tab + commentUserFullName + ' - *' + date + '*' + br;
          cardMd += '```' + br;
          cardMd += content + br;
          cardMd += '```' + br;
        });
      }

      //----------------END COMMENTS----------------

      //----------------HISTORY----------------

      cardMd += h4 + tab + 'History' + br;
      actions.forEach(function (action) {
        var type = action.type;
        var attachmentAdded = false;
        if (type.indexOf('Card') > -1) {
          var userFullName = action.memberCreator.fullName;
          var date = (new Date(action.date)).toUTCString();
          var info = '';
          switch (type) {
            case 'addAttachmentToCard':
              info = 'Added an attachment to the card:`' + br;
              info += '[' + action.data.attachment.name + '](' + action.data.attachment.url + ')';
              attachmentAdded = true;
              break;
            case 'addChecklistToCard':
              info = 'Added the checklist ' + action.data.checklist.name + ' to the card';
              break;
            case 'addMemberToCard':
              if (action.member) {
                info = 'Added ' + action.member.fullName + ' to the card';
              } else {
                // If there is no member that was added, that means that
                // the account was deleted
                info = 'Added [deleted account] to the card';
              }
              break;
            case 'commentCard':
              info = 'Commented on the card';
              break;
            case 'convertToCardFromCheckItem':
              info = 'Converted a check item into the card';
              break;
            case 'copyCard':
              info = 'Copied the card';
              break;
            case 'copyCommentCard':
              info = 'Copied a comment from the card'; //Not sure if this is right
              break;
            case 'createCard':
              info = 'Added the card to ' + action.data.list.name;
              break;
            case 'deleteAttachmentFromCard':
              info = 'Deleted an attachment from the card';
              break;
            case 'deleteCard':
              info = 'Deleted the card';
              break;
            case 'emailCard':
              info = 'Sent an email comment to the card'; //Also not sure about this
              break;
            case 'moveCardFromBoard':
              info = 'Moved the card from the ' + action.data.board.name + ' board to the ' + action.data.boardTarget.name + ' board';
              break;
            case 'moveCardToBoard':
              info = 'Moved the card to the ' + action.data.board.name + ' board from the ' + action.data.boardSource.name + ' board';
              break;
            case 'removeChecklistFromCard':
              info = 'Removed a checklist from the card';
              break;
            case 'removeMemberFromCard':
              if (action.member) {
                info = 'Removed ' + action.member.fullName + ' from the card';
              } else {
                // Same as adding a member
                info = 'Removed [deleted account] from the card';
              }
              break;
            //These are never used - Only updateCard is used
            //case 'updateCard:closed':
            //info = 'Closed the card';
            //break;
            //case 'updateCard:desc':
            //info = 'Updated the card\'s description';
            //break;
            //case 'updateCard:idList':
            //info = 'Moved the card to another list';//list change
            //break;
            //case 'updateCard:name':
            //info = 'Updated the card\'s name';
            //break;
            case 'updateCard':
              if (action.data.old.idList != null) {
                info = 'Moved the card from the ' + action.data.listBefore.name + ' list to the ' + action.data.listAfter.name + ' list';
              } else if (action.data.old.pos != null) {
                info = 'Moved the card within the ' + action.data.list.name + ' list';
              } else if (action.data.old.name != null) {
                info = 'Changed the name of the card to "' + action.data.card.name + '"';
              } else if (action.data.old.desc != null) {
                info = 'Updated the description';
              } else if (action.data.old.closed != null) {
                if (action.data.old.closed === true) {
                  info = 'Opened the card';
                } else {
                  info = 'Closed the card';
                }
              } else {
                info = 'Unknown update card action';
              }
              break;
            case 'updateCheckItemStateOnCard':
              info = 'Marked ' + action.data.checkItem.name + ' on ' + action.data.checklist.name + ' ' + action.data.checkItem.state;
              break;
            default:
              info = 'Unknown action';
          }
          cardMd += h5 + tab + tab + userFullName + ' - *' + date + '*' + br;
          cardMd += tab + tab + '`' + br;
          cardMd += info + br;
          if (!attachmentAdded) {
            cardMd += '`' + br;
          }
        }
      });

      //----------------END HISTORY----------------

      //----------------URL----------------

      cardMd += h6 + 'URL: [' + shortUrl + '](' + shortUrl + ')' + br;

      //----------------END URL----------------

      //----------------ATTACHMENTS----------------

      var attachments = cardJSON.attachments;
      //Similar to description, if there are attachments,
      //then we'll display them, else we won't show the field
      if (attachments && attachments.length > 0) {
        cardMd += h6 + 'Attachments:' + br;
        attachments.forEach(function (attachment) {
          cardMd += '* [' + attachment.name + '](' + attachment.url + ')' + br;
        });
      }

      //----------------END ATTACHMENTS----------------

      //----------------END CARD MARKDOWN----------------

      //Write the card's markdown to its markdown file
      fs.writeFileSync(boardDirectory + cardFilePath, cardMd);
    }
  });
}
