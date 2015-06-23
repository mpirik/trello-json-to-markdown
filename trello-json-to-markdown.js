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

var actionsJSON = null;

var deltaDays = 2;
var dateAdjustment = 0;
var MAX_DAYS_PER_INTERVAL = 20;
var daysPerInterval = MAX_DAYS_PER_INTERVAL;
var WAIT_TIME = 10000; //Wait 10 seconds between each interval so we're not attacking Trello's API

var numDays = process.argv[2];
var dayCountDown = numDays;

if (numDays <= deltaDays) {
  deltaDays = 1;
}

//If we don't need to go through MAX_DAYS_PER_INTERVAL days for each interval,
//we'll just limit it to the number of days that was passed in
if (numDays < MAX_DAYS_PER_INTERVAL) {
  daysPerInterval = numDays;
}

//So we can limit the amount of cards we retrieve, we'll need to store the end date
var endDate = new Date();
endDate.setDate(endDate.getDate() - numDays);

//Make sure numDays is a number >= 1
if (numDays && !isNaN(numDays) && numDays > 0) {
  console.log('Grabbing actions. This may take a while...');
  createMarkdowns()
  //var actionsInterval = setInterval(getActions, WAIT_TIME);
} else {
  console.log('Number of days to search must be a positive number greater than 0.');
  console.log('Usage: node trello-json-to-markdown.js \<number_of_days_to_search\>');
}

/**
 * This will retrieve all of the actions within a short period
 * of time up to a maximum of daysPerInterval days, and store
 * those actions into the actionsJSON array
 *
 */
function getActions() {

  for (var i = 0; i < config.boards.length; i++) {
    var boardId = config.boards[i];
    var currentDay = 0;

    var beforeDate = new Date();
    beforeDate.setDate(beforeDate.getDate() - dateAdjustment);
    var sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - dateAdjustment - deltaDays);


    while (currentDay < daysPerInterval) {

      var beforeISOString = beforeDate.toISOString();
      var sinceISOString = sinceDate.toISOString();
      var parameters = '?limit=1000&before=' + beforeISOString + '&since=' + sinceISOString;

      trelloGet(boardId, parameters, true);

      if (i === config.boards.length - 1) {
        dateAdjustment += deltaDays; //Adjust the dates for the next interval
        dayCountDown -= deltaDays;  //Update the count down for the days for the next interval
      }

      sinceDate.setDate(sinceDate.getDate() - deltaDays);
      beforeDate.setDate(beforeDate.getDate() - deltaDays);
      currentDay += deltaDays;
    }

    if (i === config.boards.length - 1 && dayCountDown < MAX_DAYS_PER_INTERVAL) {
      //If we no longer need to go through MAX_DAYS_PER_INTERVAL days for each interval,
      //just go through the remaining days
      daysPerInterval = dayCountDown;
    }
  }

  //Once we processed the last of the actions, clear the interval so it does not continue,
  //and then create the markdown files
  if (dayCountDown <= 0) {
    clearInterval(actionsInterval);
    setTimeout(createMarkdowns, WAIT_TIME);
  }
}

/**
 * This will execute a GET request to the Trello API with the
 * specified information
 *
 * @param boardId ID of the board to request actions from
 * @param parameters The parameters to pass to the GET request
 * @param ableToRetry If this request were to fail, retry the
 * request if ableToRetry is true, else do not retry the request
 */
function trelloGet(boardId, parameters, ableToRetry) {
  trello.get('/1/boards/' + boardId + '/actions' + parameters, function (error, actions) {
    if (error) {
      retry(boardId, parameters, ableToRetry);
    } else {
      if (actions && actions.length > 0) {
        if (actionsJSON) {
          try {
            actions.forEach(function (action) {
              actionsJSON[actionsJSON.length] = action;
            });
          } catch (exception) {
            retry(boardId, parameters, ableToRetry);
          }
        } else {
          actionsJSON = actions;
        }
      }
    }
  });
}

/**
 * This will attempt to retry a failed request if ableToRetry is true
 *
 * @param boardId ID of the board to request actions from
 * @param parameters The parameters to pass to the GET request
 * @param ableToRetry If this request were to fail, retry the
 * request if ableToRetry is true, else do not retry the request
 */
function retry(boardId, parameters, ableToRetry) {
  //This should grab the ISO dates out of the parameters
  var dateRegex = /\d+[\d\W]+T[\d\W]+Z/g;
  var before = (new Date(dateRegex.exec(parameters)[0])).toUTCString();
  var since = (new Date(dateRegex.exec(parameters)[0])).toUTCString();
  var msg = '';

  if (ableToRetry) {
    msg = 'An error occurred causing the actions request between ' + before + ' and ' + since + ' to fail.\n';
    msg += 'Attempting to request the data again now...\n';
    //We'll only retry failed requests one more time
    trelloGet(boardId, parameters, false);
  } else {
    msg = 'The actions request between ' + before + ' and ' + since + ' failed again.\n';
    msg += 'The data will not be requested again.\n';
  }

  console.log(msg);
}

/**
 * This will generate the markdown files for each board and
 * cards within each board
 *
 */
function createMarkdowns() {
  //console.log('Finished grabbing actions. Found ' + actionsJSON.length + ' actions.');

  /*actionsJSON.sort(function (action1, action2) {
   return Date.parse(action2.date) - Date.parse(action1.date);
   });*/

  config.boards.forEach(function (boardId) {
    trello.get('/1/boards/' + boardId + '?cards=all&lists=all&members=all&member_fields=all&checklists=all&fields=all', function (error, boardJSON) {
      if (error) {
        console.log(error);
      }
      var boardName = boardJSON.name;
      if (boardName) {
        console.log('Generating Markdowns for ' + boardName + '...');

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
          createCardMarkdown(card, boardJSON, cardPrefix, cardDirectory, boardDirectory)
        });

        //Write the table of contents to its markdown file
        fs.writeFileSync(tableOfContentsFile, tableOfContents);
        console.log('Finished generating Markdowns for ' + boardName + '.');
      }
    });
  });
}

function createCardMarkdown(card, boardJSON, cardPrefix, cardDirectory, boardDirectory) {
  var id = card.id;
  //&checklists=true&checklist_fields=all
  trello.get('/1/card/' + id + '?actions=all&actions_limit=1000&members=true&member_fields=all&checklists=all&checklist_fields=all', function (error, cardJSON) {
    if (error) {
      console.log(error);
    } else {

      var actions = cardJSON.actions;
      var members = cardJSON.members;
      var checkLists = cardJSON.checklists;

      var idShort = card.idShort;
      var cardFullId = cardPrefix + idShort;
      var cardFilePath = cardDirectory + cardFullId + '.md';
      var name = card.name;

      //----------------CARD MARKDOWN----------------

      //Set the short id of the card as the title of the markdown file
      var cardMd = h1 + ' #' + idShort + br;

      var shortUrl = card.shortUrl;
      var memberIds = card.idMembers;
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

      /*cardMd += h4 + tab + 'Members' + br;
      if (memberIds.length <= 0) {
        cardMd += tab + tab + '[no members]' + br;
      } else {
        memberIds.forEach(function (id) {
          var member = members.filter(function (memberObject) {
            if (memberObject.id === id) {
              return memberObject;
            }
          });
          cardMd += '* ' + member[0].fullName + br;
        });
      }*/

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
        // var checkListsCard = checkLists.filter(function (checkList) {
        //   return checkList.idCard === id;
        // });

        //if (checkListsCard.length > 0) {
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
        //}
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
          //if (action.data.card.id === card.id) {
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
              info = 'Added ' + action.member.fullName + ' to the card';
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
              info = 'Removed ' + action.member.fullName + ' from the card';
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
                  info = 'Open the card';
                } else {
                  info = 'Closed the card';
                }
              } else {
                info = 'Unknown update card action';
                //console.log(action);
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
        //}
      });

      //----------------END HISTORY----------------

      //----------------URL----------------

      cardMd += h6 + 'URL: [' + shortUrl + '](' + shortUrl + ')' + br;

      //----------------END URL----------------

      //----------------ATTACHMENTS----------------

      var attachments = card.attachments;
      //Similar to description, if there are attachments,
      //then we'll display them, else we won't show the field
      if (attachments && attachments.length > 0) {
        cardMd += h6 + 'Attachments:' + br;
        attachments.forEach(function (attachment) {
          cardMd += '* [' + attachment.name + '](' + attachment.url + ')';
        });
      }

      //----------------END ATTACHMENTS----------------

      //----------------END CARD MARKDOWN----------------

      //Write the card's markdown to its markdown file
      fs.writeFileSync(boardDirectory + cardFilePath, cardMd);
    }
    //console.log(cardJSON);
  });
}
