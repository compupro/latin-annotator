//Put API endpoint URLs here as constants
const ALPHEIOS_PERL_URL = "https://alpheios.net/perl/latin?word=";

//Referenced when api ling terms are replaced by human readable ones
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

/*Utility functions*/
function searchByProperty(array, property, val) {
    for (const elem of array) {
        if (elem[property] == val) {
            return elem;
        }
    }
    return null;
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

        /*Make the clickable element to be put in wordElementContainer
        This does NOT include the definition elements nor the inflection tables!*/
        this.HTMLelement = document.createElement("span");
        this.HTMLelement.className = (wordString == "\n") ? "passageLineBreak" : "wordElement";
        this.HTMLelement.innerHTML = (wordString == "\n") ? "<br />" : wordString;
        this.HTMLelement.id = this.wordID;
        
        var self = this;
        this.HTMLelement.addEventListener("click", function(){
            self.clicked();
        });
        this.HTMLelement.addEventListener("mouseover", function(){
            self.mousedover();
        });
        this.HTMLelement.addEventListener("mouseout", function(){
            self.hideTooltip();
        });

        document.getElementById("wordElementContainer").appendChild(this.HTMLelement);
    }
    
    mousedover(){
        if (this.definition == null){
            this.getWordDefinitions(false, false, null, true)
        } else {
            this.showTooltip();
        }
    }
    
    showTooltip(){
        this.hideTooltip();
        var tooltip = document.createElement("div");
        tooltip.id = "tooltip";
        var wordMeaning = this.getSelectedEntry().meaning.replace(" ", "\u00A0");
        var meaning = document.createTextNode(wordMeaning);
        tooltip.appendChild(meaning);
        
        var entry = this.definition.selectedEntry;
        var infl = this.definition.selectedInfl;
        var inflTable = searchByProperty(currentPassage.words.get(0).definition.inflTables, 'id', 'inflTable ' + entry + ' ' + infl);
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
        } else {
            this.getWordDefinitions(true, true, null, false);
        }
    }

    updateDefinitionView(){
        var definitionContainer = document.getElementById("definitionContainer");
        definitionContainer.innerHTML = "";
        for (var e = 0 ; e < this.definition.entries.length; e++){
            var entry = this.definition.entries[e]
            
            //start making the definition box where all the inflections will go inside
            var defElement = document.createElement("div");
            defElement.className = "definition";
            //the meaning of the word is put in the definition box
            var meaningElement = document.createElement("p");
            meaningElement.className = "meaning";
            meaningElement.appendChild(document.createTextNode(entry.meaning));
            defElement.appendChild(meaningElement);

            //this div contains the tables, which goes inside the definition box
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
                    var propertyValue = inflection.get(property)
                    propertyValue = propertyValue.replace("/", "/\u200b") //add zero-width spaces to slashes on the display text but not the original property
                    cell.appendChild(document.createTextNode(propertyValue));
                }
                var tbody = table.children[0];
                setInflection(tbody);

                setInflection(table);
                table.id = "inflTable " + e + " " + i;
                table.classList.add("inflTable");

                /*This part is still part of the table generation!
                This handles for the inflection switching logic for the Definition it goes with*/
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
            //table making ends here
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

    /*Gets word definitions as an XML document which is passed to updateWordDefinition()
    Optionally runs updateView and/or checkSentenceAgreement if set. I would have used callbacks for that but it didn't work.*/
    getWordDefinitions(updateView, checkSentenceAgreement, otherWord, showTooltip){
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
                if (showTooltip){
                    self.showTooltip();
                }
            }
        }
        x.send(null);
    }
    
    /*Uses the XML parser with the XML document from the API to generate the array of entries.*/
    updateWordDefintion(origin, doc){
        switch (origin) {
            case ALPHEIOS_PERL_URL:
                //If the API responded with no entry
                var definition = new Definition(origin);
                if (doc.getElementsByTagName("entry").length == 0){
                    var entry = {meaning: "Unknown meaning!"};
                    var infl = new Map();
                    infl.set("Error", "Word not recognized!");
                    entry.inflections = [infl];
                    definition.entries.push(entry);
                }

                //If there is an entry in the API response
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

    /*Checks the word's agreement with every other word in the sentence.
    Will fetch the definitions of those words if they haven't been fetched yet*/
    checkSentenceAgreement(){
        for (var wordIndex = 0; wordIndex < currentPassage.words.size; wordIndex++){
            var wordID = Array.from(currentPassage.words.keys())[wordIndex];
            var wordObj = currentPassage.words.get(wordID);
            if (wordObj.sentence == this.sentence && wordID != this.wordID &&
                wordObj.wordString != "\n"){
                if (wordObj.definition == null){
                    wordObj.getWordDefinitions(false, false, this.getSelectedInfl(), false);
                } else if (wordObj.agreesWith(this.getSelectedInfl())){
                    wordObj.agree();
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
                    return true;
                }
                return false;
                break;
            case "Adjective":
                if (myInfl.get("Part of Speech") == "Noun" &&
                    isSame("Number") && isSame("Case") &&
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
                    return true;
                }
                return false;
                break;
            case "Noun":
                if (myInfl.get("Part of Speech") == "Adjective" &&
                    isSame("Number") && isSame("Case") &&
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
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
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
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
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
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
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
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
                    this.matchGender(wordInfl.get("Gender"), myInfl.get("Gender"))){
                    return true;
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

    agree(){
        this.HTMLelement.classList.add("agrees");
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
}

var currentPassage;

function processInput(){
    currentPassage = new Passage(document.getElementById("input").value);
    document.getElementById("definitionContainer").innerHTML = "";
}