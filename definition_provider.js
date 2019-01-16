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