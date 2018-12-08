// Make the DIV element draggable:
function dragElement(elem) {
    var pos1 = 0, pos2 = 0;
    resizerBar = document.getElementById("resizer");
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
    }

    function closeDragElement() {
        resizerBar.style.backgroundColor = "rgb(245, 245, 245)";
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

dragElement(document.getElementById("definitionContainer"));