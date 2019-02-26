// Make the DIV element draggable:
function dragElement(elem) {
    var pos1 = 0, pos2 = 0;
    resizerBar = document.getElementById("bottomResizer");
    resizerBar.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        resizerBar.style.backgroundColor = "rgb(200, 200, 200)";
        // get the mouse cursor position at startup:
        pos2 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos2 - e.clientY;
        pos2 = e.clientY;
        // set the element's new position:
        elem.style.height = window.innerHeight - pos2 - 5 + "px";
        dummyElem = document.getElementById("bottomDummy");
        dummyElem.style.height = window.innerHeight - pos2 + "px";
    }

    function closeDragElement() {
        resizerBar.style.backgroundColor = "rgb(245, 245, 245)";
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

dummyElem = document.getElementById("bottomDummy");
dummyElem.style.height = document.getElementById("definitionContainer").clientHeight + "px";
dragElement(document.getElementById("definitionContainer"));

function toggleKey() {
    if (keyShown) {
        keyShown = false;
        key = document.getElementById("agreementKey");
        key.style.visibility = "hidden";
        document.getElementById("keyHider").style.position = "absolute";
        document.getElementById("keyHider").style.right = "0";
        document.getElementById("keyHider").style.height = "200px";
        document.getElementById("keyHider").style.width = "20px";
    } else {
        keyShown = true;
        key.style.visibility = "";
        document.getElementById("keyHider").style.position = "";
        document.getElementById("keyHider").style.right = "";
        document.getElementById("keyHider").style.height = "";
        document.getElementById("keyHider").style.width = "";
    }
}

var keyShown = true;
document.getElementById("keyHider").addEventListener("click", toggleKey);