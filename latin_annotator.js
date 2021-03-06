//Put API endpoint URLs here as constants
const ALPHEIOS_PERL_URL = "https://alpheios.net/perl/latin?word=";

/*Utility functions*/
function searchByProperty(array, property, val) {
    for (const elem of array) {
        if (elem[property] == val) {
            return elem;
        }
    }
    return null;
}

//Function to sort alphabetically an array of objects by some specific key.
function sortByProperty(property) {
    var sortOrder = 1;

    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }

    return function (a,b) {
        if (sortOrder == -1){
            return b[property].localeCompare(a[property]);
        } else {
            return a[property].localeCompare(b[property]);
        }
    }
}

//Returns a p element with class className containing text
function styledText(text, className) {
    p = document.createElement("p");
    p.classList.add(className);
    p.innerHTML = text;
    return p;
}

/*The Passage class creates a passage from raw text when created.
It contains all word objects of the passage.
*/
class Passage {

    constructor(rawText){
        document.getElementById("wordElementContainer").innerHTML = "";
        this.rawText = rawText;
        this.assigningWordID = 0;
        this.words = this.createwords(rawText);
    }

    /*Generates Words in the passage by stripping punctuation and running it through the Word's constructor

    These Words are stored in this.words, which is a map of words referenced by a numerical ID. These are NOT ordered, since you're supposed to be able to insert words in arbitrary positions.*/
    createwords(rawText){
        rawText = rawText.replace(/\r?\n|\r/g, " \n "); //matches newlines
        var words = new Map;
        var sentence = 0;
        for (const word of rawText.split(" ")){
            if (word != ""){
                words.set(this.assigningWordID, new Word(this.assigningWordID, word, sentence));
                this.assigningWordID++;
            }

            if (/(\.|!|\?|:)/.test(word)){ //matches .!?:
                sentence++;
            }
        }
        return words;
    }

    //Gets every word in the passage and clears their element's highlights
    clearHighlights(){
        for (const word of this.words.values()){
            word.HTMLelement.classList.remove("selected");
            for (var i = 0; i < word.HTMLelement.classList.length; i++){
                var cssClass = word.HTMLelement.classList[i]; //have to do this because classList will not iterate normally
                if (cssClass.includes("agrees")){
                    word.HTMLelement.classList.remove(cssClass);
                }
            }
        }
    }

    setAgreementKey(partOfSpeech) {
            var agreementKey = document.getElementById("agreementKey");
            agreementKey.innerHTML = "";
            var keyText = document.createElement("div");
            var keyHeader = document.createElement("h3");
            keyHeader.appendChild(document.createTextNode("Agreement Highlight Key"));
            keyText.appendChild(keyHeader);
            keyText.appendChild(styledText("Selected word: " + partOfSpeech, "selected"));
            switch (partOfSpeech){
                case "Verb":
                    keyText.appendChild(styledText("Subject", "agreesSubject"));
                    keyText.appendChild(styledText("Object", "agreesObject"));
                    keyText.appendChild(styledText("Modified by", "agreesVerbModifier"));
                    break;
                case "Noun":
                    keyText.appendChild(styledText("Verb subject of", "agreesSubject"));
                    keyText.appendChild(styledText("Verb object of", "agreesObject"));
                    keyText.appendChild(styledText("Prepositional object of", "agreesPrepObject"));
                    keyText.appendChild(styledText("Modified by", "agreesNounModifier"));
                    keyText.appendChild(styledText("Modified Noun", "agreesModifiedNoun"));keyText.appendChild(styledText("Modified Pronoun", "agreesModifiedPronoun"));
                    break;
                case "Pronoun":
                    keyText.appendChild(styledText("Verb subject of", "agreesSubject"));
                    keyText.appendChild(styledText("Verb object of", "agreesObject"));
                    keyText.appendChild(styledText("Prepositional object of", "agreesPrepObject"));
                    keyText.appendChild(styledText("Modified Noun", "agreesModifiedNoun"));
                    keyText.appendChild(styledText("Modified by", "agreesPronounModifier"));
                    break;
                case "Adverb":
                    keyText.appendChild(styledText("Modified Verb", "agreesModifiedVerb"));
                    break;
                case "Adjective":
                    keyText.appendChild(styledText("Modified Noun", "agreesModifiedNoun"));
                    keyText.appendChild(styledText("Modified Pronoun", "agreesModifiedPronoun"));
                    break;
                case "Verb participle":
                    keyText.appendChild(styledText("Modified Noun", "agreesModifiedNoun"));
                    break;
                case "Preposition":
                    keyText.appendChild(styledText("Object", "agreesPrepObject"));
                    keyText.appendChild(styledText("Modified Verb", "agreesVerbModifier"));
                    break;
                default:
                    console.log("Could not generate key text for part of speech: " + partOfSpeech);
            }
            agreementKey.appendChild(keyText);
        }
}

class Word {

    constructor(wordID, wordString, sentence){
        this.wordID = wordID;
        this.wordString = wordString;
        this.wordNoPunctuation = wordString.replace(/[^a-zA-Z0-9_ĀāĒēĪīŌōŪūĂăĔĕĬĭŎŏŬŭ]+/g, ""); //matches alphanumeric plus vowels with macron or breve
        this.sentence = sentence;
        this.definition = null;

        /*Make the clickable element to be put in wordElementContainer
        This does NOT include the definition elements nor the inflection tables!*/
        this.HTMLelement = document.createElement("span");
        this.HTMLelement.className = (wordString == "\n") ? "passageLineBreak" : "wordElement";
        if (wordString == '\n'){
            this.HTMLelement.innerHTML = "<br />";
        } else {
            this.HTMLelement.appendChild(document.createTextNode(wordString));
        }
        this.HTMLelement.id = this.wordID;
        
        this.hover = false;

        var self = this;
        this.HTMLelement.addEventListener("click", function(){
            self.clicked();
        });
        this.HTMLelement.addEventListener("mouseover", function(){
            self.mousedover();
        });
        this.HTMLelement.addEventListener("mouseout", function(){
            self.hideTooltip();
            self.hover = false;
        });

        document.getElementById("wordElementContainer").appendChild(this.HTMLelement);
        document.getElementById("wordElementContainer").appendChild(document.createTextNode(" "));
    }

    mousedover(){
        this.hover = true;
        if (this.definition == null){
            this.getWordDefinitions({"showTooltip":true})
        } else {
            this.showTooltip();
        }
    }

    showTooltip(){
        this.hideTooltip()
        if (!this.hover) {
            return;
        }
        var tooltip = document.createElement("div");
        tooltip.id = "tooltip";
        var wordMeaning = this.getSelectedEntry().meaning.replace(" ", "\u00A0");
        var meaning = document.createTextNode(wordMeaning);
        tooltip.appendChild(meaning);

        var entry = this.definition.selectedEntry;
        this.definition.generateTablesByEntry(entry, this, false);
        var infl = this.definition.selectedInfl;
        var inflTable = searchByProperty(currentPassage.words.get(this.wordID).definition.inflTables, 'id', 'inflTable ' + entry + ' ' + infl);
        inflTable = inflTable.cloneNode(true);
        inflTable.id = ""
        //inflTable.classList.remove("currentInfl");
        tooltip.appendChild(inflTable);

        this.HTMLelement.appendChild(tooltip);
    }

    hideTooltip(){
        if (document.getElementById("tooltip")){
            var tooltip = document.getElementById("tooltip");
            tooltip.remove();
        }
    }

    //When the word's wordElement gets clicked, this runs.
    clicked(){
        currentPassage.clearHighlights();
        this.HTMLelement.classList.add("selected");

        if (this.definition != null){ //If there is a definition
            this.updateDefinitionView();
            this.checkSentenceAgreement();
            currentPassage.setAgreementKey(this.getSelectedInfl().get("Part of Speech"));
        } else {
            this.getWordDefinitions({"updateView":true, "checkSentenceAgreement":true, "showKey":true});
        }
    }

    updateDefinitionView(){
        var definitionContainer = document.getElementById("definitionContainer");
        definitionContainer.innerHTML = "";
        for (var e = 0 ; e < this.definition.entries.length; e++){

            //start making the definition box where all the inflections will go inside
            var defElement = document.createElement("div");
            defElement.className = "definition";
            //the meaning of the word is put in the definition box
            var meaningElement = document.createElement("p");
            meaningElement.className = "meaning";
            meaningElement.appendChild(document.createTextNode(this.definition.entries[e].meaning));
            defElement.appendChild(meaningElement);
            
            var inflectionContainer = this.definition.generateTablesByEntry(e, this, true);

            defElement.appendChild(inflectionContainer);
            definitionContainer.appendChild(defElement);
        }
        this.scrollToSelectedDef();
    }

    scrollToSelectedDef(){
        var entry = this.definition.selectedEntry;
        var infl = this.definition.selectedInfl;
        var table = document.getElementById("inflTable " + entry + " " + infl);
        var defDiv = table.parentElement.parentElement;
        defDiv.parentElement.scrollTop = defDiv.offsetTop - 10;
    }

    getWordDefinitions(kwArgs){
        var cacheDef = getCachedDefinition(originSetting, this.wordNoPunctuation);
        if (cacheDef != null){
            this.definition = cacheDef;
            definition = this.definition;
            this.afterFetching(definition, kwArgs);
        } else {
            getAPIDoc(originSetting, this.wordNoPunctuation, this.afterFetching.bind(this), kwArgs);
        }
    }

    updateWordDefintion(definition, kwArgs){
        this.definition = definition;
        this.afterFetching(definition, kwArgs);
    }

    /*There are a bunch of things that the Word can do after a definition is acquired
    They are all in here.

    Keyword arguments are: updateView, checkSentenceAgreement, otherWord, showTooltip*/
    afterFetching(definition, kwArgs){
        this.definition = definition;
        if (kwArgs["updateView"]){
            this.updateDefinitionView();
        }
        if (kwArgs["checkSentenceAgreement"]){
            this.checkSentenceAgreement();
        } else if (kwArgs["otherWord"]){
            var otherWord = kwArgs["otherWord"];
            if (this.agreesWith(otherWord)){
                this.agree(this.agreesWith(otherWord));
            }
        }
        if (kwArgs["showTooltip"]){
            this.showTooltip();
        }
        if (kwArgs["showKey"]){
            currentPassage.setAgreementKey(this.getSelectedInfl().get("Part of Speech"));
        }
    }

    /*Checks the word's agreement with every other word in the sentence.
    Will fetch the definitions of those words if they haven't been fetched yet*/
    checkSentenceAgreement(){
        for (var wordIndex = 0; wordIndex < currentPassage.words.size; wordIndex++){
            var wordID = Array.from(currentPassage.words.keys())[wordIndex];
            var wordObj = currentPassage.words.get(wordID);
            if (wordObj.sentence == this.sentence && wordID != this.wordID &&
                wordObj.wordString != "\n"){
                if (wordObj.definition == null){
                    wordObj.getWordDefinitions({"otherWord":this.getSelectedInfl()});
                } else if (wordObj.agreesWith(this.getSelectedInfl())){
                    wordObj.agree(wordObj.agreesWith(this.getSelectedInfl()));
                }
            }
        }
    }

    /*Check this word against another word's inflection, wordInfl.

    If the other word is a certain part of speech, it checks itself for if
    fulfills agreement conditions. If it agrees, it returns true. If any part
    of this fails, it returns false.*/
    agreesWith(wordInfl){
        var myInfl = this.getSelectedInfl();
        var isSame = function(property){
                return myInfl.get(property) == wordInfl.get(property);
            };
        switch (wordInfl.get("Part of Speech")){
            case "Adverb":
                if (myInfl.get("Part of Speech") == "Verb"){
                    return "Modified verb";
                }
                return false;
                break;
            case "Adjective":
                if (myInfl.get("Part of Speech") == "Noun" &&
                    isSame("Number") && isSame("Case") &&
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
                    return "Modified noun";
                }
                if (myInfl.get("Part of Speech") == "Pronoun" &&
                    isSame("Number") && isSame("Case") &&
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
                    return "Modified pronoun";
                }
                return false;
                break;
            case "Noun":
                if (myInfl.get("Part of Speech") == "Adjective" &&
                    isSame("Number") && isSame("Case") &&
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
                    return "Noun modifier";
                }
                if (myInfl.get("Part of Speech") == "Verb" &&
                    myInfl.get("Person") == "3rd" &&
                    isSame("Number") &&
                    wordInfl.get("Case") == "Nominative"){
                    return "Subject";
                }
                if (myInfl.get("Part of Speech") == "Verb" &&
                    wordInfl.get("Case") == "Accusative"){
                    return "Object";
                }
                if (myInfl.get("Part of Speech") == "Pronoun" &&
                    isSame("Number") && isSame("Case") &&
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
                    return "Pronoun modifier";
                }
                if (myInfl.get("Part of Speech") == "Noun" &&
                    (myInfl.get("Case") == "Genitive" ||
                    wordInfl.get("Case") == "Genitive")){
                    return "Modified noun";
                }
                if (myInfl.get("Part of Speech") == "Preposition" &&
                    isSame("Case")){
                    return "Preposition";
                }
                if (myInfl.get("Part of Speech") == "Verb participle" &&
                    isSame("Number") && isSame("Case") &&
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
                    return "Noun modifier";
                }
                return false;
                break;
            case "Preposition":
                if (myInfl.get("Part of Speech") == "Noun" &&
                    isSame("Case")){
                    return "Prepositional object";
                }
                if (myInfl.get("Part of Speech") == "Pronoun" &&
                    isSame("Case")){
                    return "Prepositional object";
                }
                if (myInfl.get("Part of Speech") == "Verb"){
                    return "Modified verb";
                }
                return false;
                break;
            case "Pronoun":
                if (myInfl.get("Part of Speech") == "Noun" &&
                    isSame("Number") && isSame("Case") &&
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
                    return "Modified noun";
                }
                if (myInfl.get("Part of Speech") == "Verb" &&
                    isSame("Number") && isSame("Person") &&
                    wordInfl.get("Case") == "Nominative"){
                    return "Subject";
                }
                if (myInfl.get("Part of Speech") == "Verb" &&
                    wordInfl.get("Case") == "Accusative"){
                    return "Object";
                }
                if (myInfl.get("Part of Speech") == "Preposition" &&
                    isSame("Case")){
                    return "Prepositional object";
                }
                if (myInfl.get("Part of Speech") == "Adjective" &&
                    isSame("Number") && isSame("Case") &&
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
                    return "Pronoun modifier";
                }
                return false;
                break;
            case "Verb":
                if (myInfl.get("Part of Speech") == "Noun" &&
                    isSame("Number") &&
                    myInfl.get("Case") == "Nominative"){
                    return "Subject";
                }
                if (myInfl.get("Part of Speech") == "Noun" &&
                    myInfl.get("Case") == "Accusative"){
                    return "Object";
                }
                if (myInfl.get("Part of Speech") == "Pronoun" &&
                    isSame("Number") && isSame("Person") &&
                    myInfl.get("Case") == "Nominative"){
                    return "Subject";
                }
                if (myInfl.get("Part of Speech") == "Pronoun" &&
                    myInfl.get("Case") == "Accusative"){
                    return "Object";
                }
                if (myInfl.get("Part of Speech") == "Adverb"){
                    return "Verb modifier";
                }
                if (myInfl.get("Part of Speech") == "Preposition"){
                    return "Verb modifier";
                }
                return false;
                break;
            case "Verb participle":
                if (myInfl.get("Part of Speech") == "Noun" &&
                    isSame("Number") && isSame("Case") &&
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
                    return "Modified noun";
                }
                return false;
                break;
            default:
                return false;
        }
    }

    matchGender(gender1, gender2){
        for (const gender of gender1.split("/")){
            return gender2.includes(gender);
        }
        return false;
    }

    agree(agreementType){
        var classList = this.HTMLelement.classList;
        switch (agreementType){
            case "Subject":
                classList.add("agreesSubject");
                break;
            case "Object":
                classList.add("agreesObject");
                break;
            case "Verb modifier":
                classList.add("agreesVerbModifier");
                break;
            case "Modified verb":
                classList.add("agreesModifiedVerb");
                break;
            case "Modified noun":
                classList.add("agreesModifiedNoun");
                break;
            case "Noun modifier":
                classList.add("agreesNounModifier");
                break;
            case "Modified pronoun":
                classList.add("agreesModifiedPronoun");
                break;
            case "Pronoun modifier":
                classList.add("agreesPronounModifier");
                break;
            case "Prepositional object":
                classList.add("agreesPrepObject");
                break;
            case "Verb":
                classList.add("agreesVerb");
                break;
            case "Preposition":
                classList.add("agreesPrep");
                break;
            default:
                console.log("Agreement type not handled by agree() highlighter: " + agreementType);
                this.HTMLelement.classList.add("agrees");
        }
    }

    getSelectedEntry(){
        var entryNumber = this.definition.selectedEntry;
        var entry = this.definition.entries[entryNumber];
        return entry;
    }

    getSelectedInfl(){
        var entryNumber = this.definition.selectedEntry;
        var inflNumber = this.definition.selectedInfl;
        var entry = this.definition.entries[entryNumber];
        var infl = entry.inflections[inflNumber];
        return infl;
    }

}

class Definition {

    /*The most important part of Definition is that it contains all the possible dictionary entries and inflections for a word, stored in this.entries()

    The structure of this.entries is [{meaning="", inflections=[{"property":"value"}]}]*/
    constructor(origin_url){
        this.origin = origin_url;
        this.selectedEntry = 0;
        this.selectedInfl = 0;
        this.entries = [];
        this.inflTables = [];
    }

    generateTablesByEntry(e, wordObj, returnContainer){
        var setInflection = function(element){
                element.setAttribute("entryNumber", e);
                element.setAttribute("inflectionNumber", i);
            };

        if (returnContainer){
            var inflectionContainer = document.createElement("div");
            inflectionContainer.className = "inflections";
        }

        var entry = this.entries[e];
        for (var i = 0; i < entry.inflections.length; i++){
            var inflection = entry.inflections[i];
            var table = document.createElement("table");
            for (const property of inflection.keys()){
                var row = table.insertRow(-1);
                setInflection(row);
                var cell = row.insertCell(0)
                setInflection(cell);
                cell.appendChild(document.createTextNode(property));

                cell = row.insertCell(1);
                setInflection(cell);
                var propertyValue = inflection.get(property)
                propertyValue = propertyValue.replace("/", "/\u200b") //add zero-width spaces to slashes on the display text but not the original property
                cell.appendChild(document.createTextNode(propertyValue));
            }
            var tbody = table.children[0];
            setInflection(tbody);
            setInflection(table);
            table.id = "inflTable " + e + " " + i;
            table.classList.add("inflTable");

            if(e == this.selectedEntry && i == this.selectedInfl){
                table.classList.add("currentInfl");
            }

            //Things to do when you click an inflTable
            var self = this;
            table.addEventListener("click", function(event){
                var target = event.target.tagName.toLowerCase == "tbody" ? event.target.parentElement: event.target;
                var entryNumber = target.getAttribute("entryNumber");
                var inflectionNumber = target.getAttribute("inflectionNumber");
                self.selectedEntry = entryNumber;
                self.selectedInfl = inflectionNumber;

                for (const table of self.inflTables){
                    if(table.getAttribute("entryNumber") == self.selectedEntry &&
                    table.getAttribute("inflectionNumber") == self.selectedInfl){
                        table.classList.add("currentInfl");
                    } else {
                        table.classList.remove("currentInfl");
                    }
                }
                currentPassage.clearHighlights();
                var entry = self.entries[entryNumber];
                var infl = entry.inflections[inflectionNumber];
                currentPassage.setAgreementKey(infl.get("Part of Speech"));
                wordObj.HTMLelement.classList.add("selected");
                wordObj.checkSentenceAgreement();
            });

            if (returnContainer){
                inflectionContainer.appendChild(table);
            }
            this.inflTables.push(table);
        }
    return inflectionContainer;
    }
}

var currentPassage;
var originSetting = ALPHEIOS_PERL_URL;

function processInput(){
    currentPassage = new Passage(document.getElementById("input").value);
    document.getElementById("definitionContainer").innerHTML = "";
}