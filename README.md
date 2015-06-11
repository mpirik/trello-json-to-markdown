# trello-json-to-markdown
[trello-json-to-markdown](https://github.com/mpirik/trello-json-to-markdown) is a script that converts the JSON exports
of your [Trello](https://trello.com/) boards into Markdown files for easy viewing of the cards you have created and the
details for each card, including the history of all of the actions for each card.
# Installation
Clone the git repository via [https](https://github.com/mpirik/trello-json-to-markdown.git)
```
$ git clone https://github.com/mpirik/trello-json-to-markdown.git
```

# Usage
First export your [Trello](https://trello.com/) boards to JSON files, and then execute the following:
```
$ node trello-json-to-markdown.js path-to-your-trello-board1.json board2.json...
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
[trello-json-to-markdown](https://trello.com/b/1Mt3BuUL/trello-json-to-markdown) board  </br>
Export the board to JSON and save the file as `trello-json-to-markdown.json` where you have the `trello-json-to-markdown.js`
file
```
$ node trello-json-to-markdown.js trello-json-to-markdown.json
```
You should now have the `trello-json-to-markdown` folder that contains the `trello-json-to-markdown.md` file and the
`trello-json-to-markdown-cards` folder  </br>
Navigate into the `trello-json-to-markdown` folder and then open the `trello-json-to-markdown.md` file  </br>
> You should see something similar to [this file](example/trello-json-to-markdown/trello-json-to-markdown.md)

Now open the `trello-json-to-markdown-cards` folder and then open the `trello-json-to-markdown-3.md` file  </br>
>You should see something similar to [this file](example/trello-json-to-markdown/trello-json-to-markdown-cards/trello-json-to-markdown-3.md)
