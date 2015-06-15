# trello-json-to-markdown
[trello-json-to-markdown](https://github.com/mpirik/trello-json-to-markdown) is a [Node.js](https://nodejs.org/) script 
that generates reports for your [Trello](https://trello.com/) boards within a range of days as Markdown files for easy 
viewing of the cards you have created and the details for each card, including the history of all of the actions for 
each card.
# Installation
Clone the git repository via [https](https://github.com/mpirik/trello-json-to-markdown.git)
```
$ git clone https://github.com/mpirik/trello-json-to-markdown.git
```

# Usage
First you'll need to obtain your [Trello](https://trello.com/) developer key and application token.
### Developer Key
Follow this [link](https://trello.com/app-key).  
The value in the `Key` field is your developer key.
### Application Token
Once you have your developer key, then modify this URL accordingly:
```
https://trello.com/1/authorize?key=substitutewithyourapplicationkey&scope=read&name=My+Application&expiration=never&response_type=token
```
1. Replace `substitutewithyourapplicationkey` with your developer key.  
2. Replace `My+Application` with your application's name.  
3. Enter the modified URL into your browser, and then click Allow.  
4. The generated token is now your application's token that will never expire.  

### config.js
Now open up `config.js`. It should look like this:
```
//Replace 'your_key' with your key
module.exports.key = 'your_key';

//Replace 'your_token' with your application's token
module.exports.token = 'your_token';

//Put all of the desired boards' IDs into this array
module.exports.boards = ['boardID1', 'boardID2'];
```

Replace the key and token placeholders with your key and token. You'll also need to add the IDs of the boards you would
like to generate reports for into to the `boards` array.  

### Execution
Once you have the configuration set up, execute the following command:
```.
$ node trello-json-to-markdown.js <number_of_days_to_search>
```
Replace `<number_of_days_to_search>` with the amount of days you would like to search for. For example, to generate
reports for the last 30 days from right now, execute:
```
$ node trello-json-to-markdown.js 30
```  
The markdown files for your boards and cards will be dumped to their respective folders and files. For example:
```
+-- path-to-your-trello-board1
|   |
|   +-- path-to-your-trello-board1.md
|   |
|   +-- path-to-your-trello-board1-cards
|   |   |
|   |   +-- path-to-your-trello-board1-1.md
|   |   \-- path-to-your-trello-board1-2.md
|
+-- board2
|   |
|   +-- board2.md
|   |
|   +-- board2-cards
|   |   |
|   |   +-- board2-1.md
|   |   \-- board2-2.md
```
# Example
We'll run this against the [JSON file](example/trello-json-to-markdown.json) for the
[trello-json-to-markdown](https://trello.com/b/1Mt3BuUL/trello-json-to-markdown) board for the past 30 days.  </br>
```
$ node trello-json-to-markdown.js 30
```
You should now have the `trello-json-to-markdown` folder that contains the `trello-json-to-markdown.md` file and the
`trello-json-to-markdown-cards` folder  </br>
Navigate into the `trello-json-to-markdown` folder and then open the `trello-json-to-markdown.md` file  </br>
> You should see something similar to [this file](example/trello-json-to-markdown/trello-json-to-markdown.md)

Now open the `trello-json-to-markdown-cards` folder and then open the `trello-json-to-markdown-3.md` file  </br>
>You should see something similar to [this file](example/trello-json-to-markdown/trello-json-to-markdown-cards/trello-json-to-markdown-3.md)
