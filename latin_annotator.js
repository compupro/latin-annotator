const ALPHEIOS_PERL_URL = "https://alpheios.net/perl/latin?word=";


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

    clearHighlights(){
        for (const word of this.words.values()){
            word.HTMLelement.classList.remove("selected");
            word.HTMLelement.classList.remove("agrees");
        }
    }
}

class Word {

    constructor(wordID, wordString, sentence){
        this.wordID = wordID;
        this.wordString = wordString;
        this.wordNoPunctuation = wordString.replace(/[^a-zA-Z0-9_ĀāĒēĪīŌōŪūĂăĔĕĬĭŎŏŬŭ]+/g, ""); //matches alphanumeric plus vowels with macron or breve
        this.sentence = sentence;
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
        this.HTMLelement.classList.add("selected");

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
            var setInflection = function(element){
                element.setAttribute("entryNumber", e);
                element.setAttribute("inflectionNumber", i);
            };
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
                    cell.appendChild(document.createTextNode(inflection.get(property)));
                }
                var tbody = table.children[0];
                setInflection(tbody);

                setInflection(table);
                table.id = "inflTable " + e + " " + i;

                var self = this;
                table.addEventListener("click", function(event){
                    var target = event.target.tagName.toLowerCase == "tbody" ? event.target.parentElement: event.target;
                    var entryNumber = target.getAttribute("entryNumber");
                    var inflectionNumber = target.getAttribute("inflectionNumber");
                    self.definition.selectedEntry = entryNumber;
                    self.definition.selectedInfl = inflectionNumber;

                    for (const table of self.definition.inflTables){
                        if(table.getAttribute("entryNumber") == self.definition.selectedEntry &&
                        table.getAttribute("inflectionNumber") == self.definition.selectedInfl){
                            table.classList.add("currentInfl");
                        } else {
                            table.classList.remove("currentInfl");
                        }
                    }

                    currentPassage.clearHighlights();
                    self.HTMLelement.classList.add("selected");
                    self.checkSentenceAgreement();
                });
                if(e == this.definition.selectedEntry && i == this.definition.selectedInfl){
                    table.classList.add("currentInfl");
                }
                inflectionContainer.appendChild(table);
                this.definition.inflTables.push(table);
            }
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
        defDiv.scrollIntoView();
    }

    getWordDefinitions(updateView, checkSentenceAgreement, otherWord){
        var x = new XMLHttpRequest();
        x.open("GET", ALPHEIOS_PERL_URL+this.wordNoPunctuation, true);

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
                        if (inflection.get("Part of Speech") == "Pronoun"){
                            inflection.set("Person", this.pronounPerson(meaning));
                        }
                        convertedEntry.inflections.push(inflection);
                    }
                    definition.entries.push(convertedEntry);
                }
                this.definition = definition;
                break;
        }
    }

    pronounPerson(meaning){
        if (meaning == "I, me (PERS); myself (REFLEX);"){
            return "1st";
        } else if (meaning == "you (sing.); thou/thine/thee/thy (PERS); yourself/thyself (REFLEX);"){
            return "2nd";
        } else {
            return "3rd";
        }
    }

    checkSentenceAgreement(){
        for (var wordIndex = 0; wordIndex < currentPassage.words.size; wordIndex++){
            var wordID = Array.from(currentPassage.words.keys())[wordIndex];
            var wordObj = currentPassage.words.get(wordID);
            if (wordObj.sentence == this.sentence && wordID != this.wordID &&
                wordObj.wordString != "\n"){
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
                    myInfl.get("Person") == "3rd" &&
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
                if (myInfl.get("Part of Speech") == "Verb participle" &&
                    isSame("Number") && isSame("Case") &&
                    myInfl.get("Gender").includes(wordInfl.get("Gender"))){
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
                    isSame("Number") && isSame("Person") &&
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
                    isSame("Number") && isSame("Person") &&
                    myInfl.get("Case") == "Nominative"){
                    return true;
                }
                if (myInfl.get("Part of Speech") == "Adverb"){
                    return true;
                }
                return false;
                break;
            case "Verb participle":
                if (myInfl.get("Part of Speech") == "Noun" &&
                    isSame("Number") && isSame("Case") &&
                    wordInfl.get("Gender").includes(myInfl.get("Gender"))){
                    return true;
                }
                return false;
                break;
            default:
                return false;
        }
    }

    agree(){
        this.HTMLelement.classList.add("agrees");
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

    constructor(origin_url){
        this.origin = origin_url;
        this.selectedEntry = 0;
        this.selectedInfl = 0;
        this.entries = [];
        this.inflTables = [];
    }
}

var currentPassage;

function processInput(){
    currentPassage = new Passage(document.getElementById("input").value);
}