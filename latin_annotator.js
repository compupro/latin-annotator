const ALPHEIOS_PERL_URL = "https://alpheios.net/perl/latin?word=";
const SELECTED_COLOR = "#acff68";
const AGREE_COLOR = "#ddffc2";


const linguisticTerms = {
    "pofs":"Part of Speech",
    "decl":"Declension",
    "num":"Number",
    "gend":"Gender",
    "comp":"Degree of Comparison",
    "voice":"Voice",
    "pers":"Person",
    "sort":"Cardinality",
    "var":"Variant",
    "conj":"Conjugation",
    "6th":"Irregular",
    "7th":"Irregular",
    "9th":"Irregular",
    "common":"Masculine/Feminine",
    "all":"Masculine/Feminine/Neuter"
    };

class Passage {

    constructor(rawText){
        document.getElementById("wordElementContainer").innerHTML = "";
        this.rawText = rawText;
        this.assigningWordID = 0;
        this.words = this.createwords(rawText);
    }

    createwords(rawText){
        rawText = rawText.replace(/\r?\n|\r/g, " \n ");
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

    clearHighlights(){
        for (const word of this.words.values()){
            word.HTMLelement.style.backgroundColor = "";
        }
    }
}

class Word {

    constructor(wordID, wordString, sentenceNumber){
        this.wordID = wordID;
        this.wordString = wordString;
        this.wordNoPunctuation = wordString.replace(/\W+/g, "");
        this.sentenceNumber = sentenceNumber;
        this.definition = null;

        this.HTMLelement = document.createElement("span");
        this.HTMLelement.className = "wordElement";
        this.HTMLelement.innerHTML = (wordString == "\n") ? "<br />" : wordString;
        this.HTMLelement.id = this.wordID;

        var self = this;
        this.HTMLelement.addEventListener("click", function(){
            self.clicked();
        });

        document.getElementById("wordElementContainer").appendChild(this.HTMLelement);

        this.agreementList = null; //TEMPORARY?
    }

    clicked(){
        currentPassage.clearHighlights();
        this.HTMLelement.style.backgroundColor = SELECTED_COLOR;

        if (this.definition != null){
            this.updateDefinitionView();
            this.checkSentenceAgreement();
        } else {
            this.getWordDefinitions(true, true, null);
        }
    }

    updateDefinitionView(){
        var definitionContainer = document.getElementById("definitionContainer");
        definitionContainer.innerHTML = "";
        for (var e = 0 ; e < this.definition.entries.length; e++){
            var entry = this.definition.entries[e]
            var defElement = document.createElement("div");
            defElement.className = "definition";
            var meaningElement = document.createElement("p");
            meaningElement.className = "meaning";
            meaningElement.appendChild(document.createTextNode(entry.meaning));
            defElement.appendChild(meaningElement);

            var inflectionContainer = document.createElement("div");
            inflectionContainer.className = "inflections";
            //start making the table here
            for (var i = 0; i < entry.inflections.length; i++){
                var inflection = entry.inflections[i];
                var table = document.createElement("table");
                for (const property of inflection.keys()){
                    var row = table.insertRow(-1);
                    row.setAttribute("entryNumber", e);
                    row.setAttribute("inflectionNumber", i);
                    var cell = row.insertCell(0)
                    cell.setAttribute("entryNumber", e);
                    cell.setAttribute("inflectionNumber", i);
                    cell.appendChild(document.createTextNode(property));

                    cell = row.insertCell(1);
                    cell.setAttribute("entryNumber", e);
                    cell.setAttribute("inflectionNumber", i);
                    cell.appendChild(document.createTextNode(inflection.get(property)));
                }
                var tbody = table.children[0];
                tbody.setAttribute("entryNumber", e);
                tbody.setAttribute("inflectionNumber", i);

                table.setAttribute("entryNumber", e);
                table.setAttribute("inflectionNumber", i);

                var self = this;
                table.addEventListener("click", function(event){
                    var target = event.target.tagName.toLowerCase == "tbody" ? event.target.parentElement: event.target;
                    var entryNumber = target.getAttribute("entryNumber");
                    var inflectionNumber = target.getAttribute("inflectionNumber");
                    self.definition.selectedInflection = [entryNumber, inflectionNumber];
                    currentPassage.clearHighlights();
                    self.HTMLelement.style.backgroundColor = SELECTED_COLOR;
                    self.checkSentenceAgreement();
                });
                inflectionContainer.appendChild(table);
            }
            defElement.appendChild(inflectionContainer);
            definitionContainer.appendChild(defElement);
        }
    }

    getWordDefinitions(updateView, checkSentenceAgreement, otherWord){
        var x = new XMLHttpRequest();
        x.open("GET", ALPHEIOS_PERL_URL+this.wordString, true);

        var self = this;
        x.onreadystatechange = function () {
            if (x.readyState == 4 && x.status == 201) {
                var doc = x.response;
                var parser = new DOMParser();
                doc = parser.parseFromString(doc, "text/xml");
                self.updateWordDefintion(ALPHEIOS_PERL_URL, doc);
                if (updateView){
                    self.updateDefinitionView();
                }
                if (checkSentenceAgreement){
                    self.checkSentenceAgreement();
                } else if (otherWord != null){
                    if (self.agreesWith(otherWord)){
                        self.agree();
                    }
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
                    try {
                        var meaning = entry.getElementsByTagName("mean")[0].textContent;
                    } catch (TypeError) {
                        var meaning = "Unknown meaning!";
                    }
                    var convertedEntry = {meaning: meaning};
                    convertedEntry.inflections = [];
                    var capitalize = function(s){return s[0].toUpperCase() + s.slice(1);}
                    for (const infl of entry.getElementsByTagName("infl")){
                        var inflection = new Map;
                        for (const property of infl.children){
                            inflection.set(
                                linguisticTerms[property.tagName] != undefined ? linguisticTerms[property.tagName] : capitalize(property.tagName),
                                linguisticTerms[property.textContent] != undefined ? linguisticTerms[property.textContent] : capitalize(property.textContent)
                            ); //Tries to replace terms according to  linguisticTerms if able, otherwise capitalizes the term from the XML and uses that.
                        }
                        convertedEntry.inflections.push(inflection);
                    }
                    definition.entries.push(convertedEntry);
                }
                this.definition = definition;
                break;
        }
    }

    checkSentenceAgreement(){
        for (var wordIndex = 0; wordIndex < currentPassage.words.size; wordIndex++){
            var wordID = Array.from(currentPassage.words.keys())[wordIndex];
            var wordObj = currentPassage.words.get(wordID);
            if (wordObj.sentence == this.sentence && wordID != this.wordID){
                if (wordObj.definition == null){
                    wordObj.getWordDefinitions(false, false, this.getSelectedInfl());
                } else if (wordObj.agreesWith(this.getSelectedInfl())){
                    wordObj.agree();
                }
            }
        }
    }

    agreesWith(wordInfl){
    /*Check this word against another word's inflection, wordInfl.

    If the other word is a certain part of speech, it checks itself for if
    fulfills agreement conditions. If it agrees, it returns true. If any part
    of this fails, it returns false.*/
        var myInfl = this.getSelectedInfl();
        var isSame = function(property){
                return myInfl.get(property) == wordInfl.get(property);
            };
        switch (wordInfl.get("Part of Speech")){
            case "Adverb":
                if (myInfl.get("Part of Speech") == "Verb"){
                    return true;
                }
                return false;
                break;
            case "Adjective":
                if (myInfl.get("Part of Speech") == "Noun" &&
                    isSame("Number") && isSame("Case") &&
                    wordInfl.get("Gender").includes(myInfl.get("Gender"))){
                    return true;
                }
                return false;
                break;
            case "Noun":
                if (myInfl.get("Part of Speech") == "Adjective" &&
                    isSame("Number") && isSame("Case") &&
                    myInfl.get("Gender").includes(wordInfl.get("Gender"))){
                    return true;
                }
                if (myInfl.get("Part of Speech") == "Verb" &&
                    isSame("Number") &&
                    wordInfl.get("Case") == "Nominative"){
                    return true;
                }
                if (myInfl.get("Part of Speech") == "Pronoun" &&
                    isSame("Number") && isSame("Case") &&
                    myInfl.get("Gender").includes(wordInfl.get("Gender"))){
                    return true;
                }
                if (myInfl.get("Part of Speech") == "Noun" &&
                    (myInfl.get("Case") == "Genitive" ||
                    wordInfl.get("Case") == "Genitive")){
                    return true;
                }
                if (myInfl.get("Part of Speech") == "Preposition" &&
                    isSame("Case")){
                    return true;
                }
                return false;
                break;
            case "Preposition":
                if (myInfl.get("Part of Speech") == "Noun" &&
                    isSame("Case")){
                    return true;
                }
                if (myInfl.get("Part of Speech") == "Pronoun" &&
                    isSame("Case")){
                    return true;
                }
                return false;
                break;
            case "Pronoun":
                if (myInfl.get("Part of Speech") == "Noun" &&
                    isSame("Number") && isSame("Case") &&
                    wordInfl.get("Gender").includes(myInfl.get("Gender"))){
                    return true;
                }
                if (myInfl.get("Part of Speech") == "Verb" &&
                    isSame("Number") &&
                    wordInfl.get("Case") == "Nominative"){
                    return true;
                }
                if (myInfl.get("Part of Speech") == "Preposition" &&
                    isSame("Case")){
                    return true;
                }
                return false;
                break;
            case "Verb":
                if (myInfl.get("Part of Speech") == "Noun" &&
                    isSame("Number") &&
                    myInfl.get("Case") == "Nominative"){
                    return true;
                }
                if (myInfl.get("Part of Speech") == "Pronoun" &&
                    isSame("Number") &&
                    myInfl.get("Case") == "Nominative"){
                    return true;
                }
                if (myInfl.get("Part of Speech") == "Adverb"){
                    return true;
                }
                return false;
                break;
            default:
                return false;
        }
    }


    agree(){
        this.HTMLelement.style.backgroundColor = AGREE_COLOR;
    }

    getSelectedInfl(){
        var entryNumber = this.definition.selectedInflection[0];
        var inflNumber = this.definition.selectedInflection[1];
        var entry = this.definition.entries[entryNumber];
        var infl = entry.inflections[inflNumber];
        return infl;
    }
}

class Definition {

    constructor(origin_url){
        this.origin = origin_url;
        this.selectedInflection = [0,0]; //first entry #, then inflection #
        this.entries = [];
    }
}

var currentPassage;

function processInput(){
    currentPassage = new Passage(document.getElementById("input").value);
}