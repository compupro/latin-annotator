//Used by appending a Perseus Scaife URN to the end.
const SCAIFE_URL = 'https://scaife-cts.perseus.org/api/cts?request=GetPassage&urn=';

function getScaife() {
    var urn = document.getElementById('scaifeSelector').value;
    var request_url = SCAIFE_URL + urn;
    
    var x = new XMLHttpRequest();
    x.open("GET", request_url, true);
    x.onreadystatechange = function () {
        if (x.readyState == 4 && x.status == 200) {
            var doc = x.response;
            var parser = new DOMParser();
            doc = parser.parseFromString(doc, "text/xml");
            
            var paragraphs = Array.from(doc.getElementsByTagName('p'));
            paragraphs = paragraphs.map(y => y.textContent);
            var text = paragraphs.join('\n\n');
            
            document.getElementById('input').value = text;
        } else {
            error_text = "Unable to get text from URN: " + urn + "\nEither the URN is incorrect, is from a service other than Perseus 5.0, or Perseus is down.";
            document.getElementById('input').value = error_text;
        }
    }
    x.send(null);
}