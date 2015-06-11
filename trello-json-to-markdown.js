var fs = require('fs');

var hr = '___';
var h1 = '#';
var h3 = '###';
var h4 = '####';
var h5 = '#####';
var h6 = '######';
var br = '\n';
var tab = '&nbsp;&nbsp;&nbsp;&nbsp;';

process.argv.forEach(function (val, index, array) {
  try {
    //Make sure the argument is a JSON file
    if (endsWith(val, '.json')) {
      var fileContents = fs.readFileSync(val, 'utf8');
      var boardJSON = JSON.parse(fileContents);

      var boardName = boardJSON.name;
      var boardShortUrl = boardJSON.shortUrl;
      var cards = boardJSON.cards;
      var actions = boardJSON.actions;
      var members = boardJSON.members;
      var labels = boardJSON.labels;

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

      cards.forEach(function (card, index) {
        var id = card.idShort;
        var cardFullId = cardPrefix + id;
        var cardFilePath = cardDirectory + cardFullId + '.md';
        var name = card.name;

        //Add the card to the table of contents and link the card to the card's markdown file
        tableOfContents += h3 + '[Card #' + id + '](' + cardFilePath + ')' + br;
        tableOfContents += '[' + cardFullId + '](' + cardFilePath + ')' + br;
        tableOfContents += h6 + name + br;
        tableOfContents += '*Last Modified: ' + (new Date(card.dateLastActivity)).toUTCString() + '*' + br;
        tableOfContents += hr + br;

        //----------------CARD MARKDOWN----------------

        //Set the short id of the card as the title of the markdown file
        var cardMd = h1 + ' #' + id + br;

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
        }
        else {
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
        if (memberIds.length <= 0) {
          cardMd += tab + tab + '[no members]' + br;
        }
        else {
          memberIds.forEach(function (id) {
            var member = members.filter(function (memberObject) {
              if (memberObject.id === id) {
                return memberObject;
              }
            });
            cardMd += '* ' + member[0].fullName + br;
          });
        }

        //----------------END MEMBERS----------------

        //----------------LABELS----------------

        cardMd += br + h4 + tab + 'Labels' + br;
        if (cardLabels.length <= 0) {
          cardMd += tab + tab + '[no labels]' + br;
        }
        else {
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

        //----------------COMMENTS----------------

        cardMd += br + h4 + tab + 'Comments' + br;
        var commentActions = actions.filter(function (action) {
          if (action.type === 'commentCard' && action.data.card.idShort === id) {
            return action;
          }
        });
        if (commentActions.length <= 0) {
          cardMd += tab + tab + '[no comments]' + br;
        }
        else {
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
            if (action.data.card.idShort === id) {
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
                  info = 'Created the card';
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
                /* These are never used - Only updateCard is used
                 case 'updateCard:closed':
                 info = 'Closed the card';
                 break;
                 case 'updateCard:desc':
                 info = 'Updated the card\'s description';
                 break;
                 case 'updateCard:idList':
                 info = 'Moved the card to another list';//list change
                 break;
                 case 'updateCard:name':
                 info = 'Updated the card\'s name';
                 break;
                 */
                case 'updateCard':
                  if (action.data.old.idList != null) {
                    info = 'Moved the card from the ' + action.data.listBefore.name + ' list to the ' + action.data.listAfter.name + ' list';
                  }
                  else if (action.data.old.pos != null) {
                    info = 'Moved the card within the ' + action.data.list.name + ' list';
                  }
                  else if (action.data.old.name != null) {
                    info = 'Changed the name of the card to "' + action.data.card.name + '"';
                  }
                  else if (action.data.old.desc != null) {
                    info = 'Updated the description';
                  }
                  else if (action.data.old.closed != null) {
                    if (action.data.old.closed == true) {
                      info = 'Open the card';
                    }
                    else {
                      info = 'Closed the card';
                    }
                  }
                  else {
                    info = 'Unknown action';
                  }
                  break;
                case 'updateCheckItemStateOnCard':
                  info = 'Update a check item state on the card';
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
          }
        });

        //----------------END HISTORY----------------

        //----------------URL----------------

        cardMd += h6 + 'URL: [' + shortUrl + '](' + shortUrl + ')' + br;

        //----------------END URL----------------

        //----------------ATTACHMENTS----------------

        var attachments = card.attachments;
        //Similar to description, if there are attachments,
        //then we'll display them, else we won't show the field
        if (attachments.length > 0) {
          cardMd += h6 + 'Attachments:' + br;
          attachments.forEach(function (attachment) {
            cardMd += '* [' + attachment.name + '](' + attachment.url + ')';
          });
        }

        //----------------END ATTACHMENTS----------------

        //----------------END CARD MARKDOWN----------------

        //Write the card's markdown to its markdown file
        fs.writeFileSync(boardDirectory + cardFilePath, cardMd);
      });

      //Write the table of contents to its markdown file
      fs.writeFileSync(tableOfContentsFile, tableOfContents);

    }
  } catch (error) {
    console.log(error);
  }
});

/**
 * This will check if the given string ends with the
 * specified suffix
 *
 * @param str String to check its suffix
 * @param suffix Suffix to check against
 * @returns {boolean} True if str ends with suffix, false otherwise
 */
function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
