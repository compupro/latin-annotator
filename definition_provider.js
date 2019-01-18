/*Cache-based provider*/

//Keys in definitionCache are all concatenated origin+wordNoPunctuation
var definitionCache = {};

/*Returns a Definition of a origin and word string pair if there is one
Returns null otherwise*/
function getCachedDefinition(origin, word){
    key = origin + word;
    def = definitionCache[key];
    return (def == undefined) ? null : def;
}

//Sets the Definition of a word based on an origin, word pair
function setCachedDefinition(origin, word, definition){
    definitionCache[origin + word] = definition;
}

/*API-based provider*/

//callbackArgs is probably kwArgs for Word.afterFetching()
function getAPIDoc(origin, word, callback, callbackArgs){
    if (origin == ALPHEIOS_PERL_URL){
        request_url = origin+word;
    }
    
    var x = new XMLHttpRequest();    
    x.open("GET", request_url, true);
    x.onreadystatechange = function () {
        if (x.readyState == 4 && x.status == 201) {
            var doc = x.response;
            var parser = new DOMParser();
            doc = parser.parseFromString(doc, "text/xml");
            definition = parseDoc(origin, doc);
            setCachedDefinition(ALPHEIOS_PERL_URL, word, definition);
            callback(definition, callbackArgs);
        }
    }
    x.send(null);
}

/*Uses the XML parser with the XML document from the API to generate the array of entries.*/
function parseDoc(origin, doc){
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
                try {
                    var frequency = entry.getElementsByTagName("freq")[0].getAttribute("order");
                    if (frequency == null){
                        var frequency = "0"; //"constrictam" yields <freq>Pliny</freq>, which is probably uncommon.
                    }
                } catch (TypeError) {
                    console.log("Couldn't get frequency data for the following entry:");
                    console.log(entry);
                    var frequency = "999";
                }
                var convertedEntry = {meaning: meaning, frequency: frequency};
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
                        inflection.set("Person", pronounPerson(meaning));
                    }
                    convertedEntry.inflections.push(inflection);
                }
                definition.entries.push(convertedEntry);
            }
            definition.entries = definition.entries.sort(sortByProperty("-frequency"));
            break;
    }
    return definition;
}

function pronounPerson(meaning){
    if (meaning == "I, me (PERS); myself (REFLEX);" || meaning == "we (pl.), us;"){
        return "1st";
    } else if (meaning == "you (sing.); thou/thine/thee/thy (PERS); yourself/thyself (REFLEX);" || meaning == "you (pl.), ye;"){
        return "2nd";
    } else {
        return "3rd";
    }
}