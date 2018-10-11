const ALPHEIOS_PERL_URL = "https://alpheios.net/perl/latin?word=";

class Word {

    constructor(wordID, wordString, sentenceNumber){
        this.wordID = wordID;
        this.wordString = wordString;
        this.wordNoPunctuation = wordString.replace(/\W+/g, '');
        this.sentenceNumber = sentenceNumber;
        this.definition = null;
        this.definitionOrigin = null;
 
        this.HTMLelement = document.createElement("span");
        this.HTMLelement.className = "wordElement";
        this.HTMLelement.innerHTML = (wordString == "\n") ? "<br />" : wordString;
        this.HTMLelement.id = this.wordID;

        var self = this;
        this.HTMLelement.addEventListener('click', function(){
            self.clicked();
        });

        document.getElementById("wordElementContainer").appendChild(this.HTMLelement);

        this.agreementList = [2, 4]; //TEMPORARY?
    }
 
    clicked(){
        if (this.definition != null){
            this.updateDefinitionView();
        } else {
            this.getWordDefinitions(true);
        }
 
        for (var wordIndex = 0; wordIndex < currentPassage.words.size; wordIndex++){
            var wordIDCompared = Array.from(currentPassage.words.keys())[wordIndex];
            var wordObjCompared = currentPassage.words.get(wordIDCompared);
            if (wordObjCompared.agreementList.includes(this.wordID)){
                //DO THINGS THAT HAPPEN WHEN A WORD AGREES WITH THE CURRENT WORD
            }
        }
    }
 
    updateDefinitionView(){
        var definitionContainer = document.getElementById("definitionContainer");
        definitionContainer.innerHTML = "";
        for (const entry of this.definition.entries){
            var defElement = document.createElement("div");
            defElement.className = "definition";
            defElement.appendChild(document.createTextNode(entry.meaning));

            //start making the table here
            /*var table = document.createElement('table');
            var row = table.insertRow(0);
            var cell = row.insertCell(0);
            cell.appendChild(document.createTextNode("sadfasdfasdf"));*/
            //stop making the table here
 
            definitionContainer.appendChild(defElement);
            definitionContainer.appendChild(table);
        }
    }
 
    getWordDefinitions(updateView){
        var x = new XMLHttpRequest();
        x.open('GET', ALPHEIOS_PERL_URL+this.wordString, true);
 
        var self = this;
        x.onreadystatechange = function () {
            if (x.readyState == 4 && x.status == 201) {
                var doc = x.response;
                var parser = new DOMParser();
                doc = parser.parseFromString(doc, "text/xml");
                self.updateWordDefintion(ALPHEIOS_PERL_URL, doc);
                if (updateView == true){ 
                    self.updateDefinitionView();
                }
            }
        }
        x.send(null);
    }

    updateWordDefintion(origin, doc){
        switch (origin) {
            case ALPHEIOS_PERL_URL:
                var definition = new Definition(origin);
                for (const entry of doc.getElementsByTagName("entry")){
                    var convertedEntry = {meaning: entry.getElementsByTagName("mean")[0].textContent};
                    convertedEntry.inflections = [];
                    for (const infl of entry.getElementsByTagName("infl")){
                        var inflection = new Map;
                        for (const property of infl.children){
                            inflection.set(property.tagName, property.textContent);
                        }
                        convertedEntry.inflections.push(inflection);
                    }
                    definition.entries.push(convertedEntry);
                }
                this.definition = definition;
                break;
        }
    }
}

class Passage {
 
    constructor(rawText){
        document.getElementById("wordElementContainer").innerHTML = "";
        this.rawText = rawText;
        this.assigningWordID = 0;
        this.words = this.createwords(rawText);
    }
 
    createwords(rawText){
        rawText = rawText.replace(/\r?\n|\r/g, ' \n ');
        var words = new Map;
        var sentence = 0;
        for (const word of rawText.split(" ")){
            if (word != ""){
                words.set(this.assigningWordID, new Word(this.assigningWordID, word, sentence));
                this.assigningWordID++;
            }

            if (word.includes(".")){
                sentence++;
            }
        }
        return words;
    }
}

class Definition {
 
    constructor(origin_url){
        this.origin = origin_url;
        this.selectedDefinition = [0,0];
        this.entries = [];
    }
}

var currentPassage;

function processInput(){
    currentPassage = new Passage(document.getElementById('input').value);
}