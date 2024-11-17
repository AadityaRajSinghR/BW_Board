window.onload = function () {
    // Elements
    const cursor = document.getElementById('cursor');
    const pencilButton = document.getElementById('pencilButton');
    const eraserButton = document.getElementById('eraserButton');
    const canvas = document.getElementById('drawingCanvas');
    const addTextButton = document.getElementById('addTextButton');
    const font_size = document.getElementById('font_size');

    const ctx = canvas.getContext('2d');


    // Drawing States
    let isDrawing = false;
    let addTextMode = false;
    let pencilMode = false;
    let eraserMode = false;

    // Drawing Variables
    let lastX = 0;
    let lastY = 0;
    let eraserSize = 10;

    // Stored Items
    let texts = [];
    let drawingPaths = [];

    // Canvas Scale
    let scaleFactor = 1.0; // Initial scale factor
    let zoomIncrement = 0.1; // Amount of zoom per action

    // Panning
    let canvasXOffset = 0;
    let canvasYOffset = 0;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;


    function setActiveTool(tool) {
        resetToolState();
        switch (tool) {
            case 'pencil':
                pencilMode = true;
                pencilButton.classList.add('bg-indigo-600');
                eraserButton.classList.remove('bg-indigo-600');
                addTextButton.classList.remove('bg-indigo-600');
                cursor.style.display = 'none';
                canvas.classList.add('cursor-crosshair');

                break;
            case 'eraser':
                eraserMode = true;
                eraserButton.classList.add('bg-indigo-600');
                pencilButton.classList.remove('bg-indigo-600');
                addTextButton.classList.remove('bg-indigo-600');
                cursor.style.display = 'block';

                break;
            case 'text':
                addTextMode = true;
                addTextButton.classList.add('bg-indigo-600');
                eraserButton.classList.remove('bg-indigo-600');
                pencilButton.classList.remove('bg-indigo-600');
                cursor.style.display = 'none';
                canvas.classList.add('cursor-text');

                break;
        }
    }

    function resetToolState() {
        pencilMode = false;
        eraserMode = false;
        addTextMode = false;
    }

    // === Zooming ===
    function applyZoom(factor) {
        scaleFactor *= factor;
        redrawCanvas();
    }

    // === Redrawing Canvas ===
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPaths();
        drawTexts();
    }

    // Event listeners for zoom in/out using keys or buttons
    window.addEventListener('keydown', (e) => {
        if (e.key === '+') {
            applyZoom(1 + zoomIncrement); // Zoom in
        } else if (e.key === '-') {
            applyZoom(1 - zoomIncrement); // Zoom out
        }
    });

    document.getElementById('zoomInButton').addEventListener('click', () => applyZoom(1 + zoomIncrement));
    document.getElementById('zoomOutButton').addEventListener('click', () => applyZoom(1 - zoomIncrement));



    // === Shortcut Keys ===
    let keysPressed = {};


    // === Undo and Redo ===
    let undoStack = [];
    let redoStack = [];

    function saveState() {
        undoStack.push({
            texts: JSON.parse(JSON.stringify(texts)),
            drawingPaths: JSON.parse(JSON.stringify(drawingPaths))
        });
        redoStack = []; // Clear redo stack on new action
    }

    function undo() {
        if (undoStack.length > 0) {
            const lastState = undoStack.pop();
            redoStack.push({
                texts: JSON.parse(JSON.stringify(texts)),
                drawingPaths: JSON.parse(JSON.stringify(drawingPaths))
            });
            texts = lastState.texts;
            drawingPaths = lastState.drawingPaths;
            setLocalStorage();
            redrawCanvas();
        }
    }

    function redo() {
        if (redoStack.length > 0) {
            const nextState = redoStack.pop();
            undoStack.push({
                texts: JSON.parse(JSON.stringify(texts)),
                drawingPaths: JSON.parse(JSON.stringify(drawingPaths))
            });
            texts = nextState.texts;
            drawingPaths = nextState.drawingPaths;
            setLocalStorage();
            redrawCanvas();
        }
    }

    // Save state before any drawing or text addition
    canvas.addEventListener('mousedown', saveState);
    document.getElementById('addTextButton').addEventListener('click', saveState);

    // Event listeners for undo and redo
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'z') {
            undo();
        } else if (e.ctrlKey && e.key === 'y') {
            redo();
        }
    });



    // === Local Storage Management ===
    function setLocalStorage() {
        localStorage.setItem('texts', JSON.stringify(texts));
        localStorage.setItem('drawingPaths', JSON.stringify(drawingPaths));

    }

    // Load texts and paths from local storage on page load
    if (localStorage.getItem('texts')) {
        texts = JSON.parse(localStorage.getItem('texts'));
    }
    if (localStorage.getItem('drawingPaths')) {
        drawingPaths = JSON.parse(localStorage.getItem('drawingPaths'));
    }



    window.addEventListener('keyup', (e) => {
        delete keysPressed[e.key];
    });
    // === Drawing and Erasing ===
    function drawPath(e) {
        const colorPicker = document.getElementById('color_picker').value;
        const brushSize = document.getElementById('brush_size').value;

        const path = {
            startX: lastX,
            startY: lastY,
            endX: (e.offsetX - canvasXOffset) / scaleFactor,
            endY: (e.offsetY - canvasYOffset) / scaleFactor,
            color: colorPicker,
            size: brushSize
        };
        drawingPaths.push(path);
        setLocalStorage();
        lastX = path.endX;
        lastY = path.endY;
        redrawCanvas();
    }

    function erasePath(e) {
        const mouseX = (e.offsetX - canvasXOffset) / scaleFactor;
        const mouseY = (e.offsetY - canvasYOffset) / scaleFactor;
        drawingPaths = drawingPaths.filter((path) => {
            return !(Math.abs(path.startX - mouseX) < eraserSize && Math.abs(path.startY - mouseY) < eraserSize);
        });
        setLocalStorage();
        redrawCanvas();
    }

    function stopDrawing() {
        isDrawing = false;
    }

    canvas.addEventListener('mousedown', (e) => {
        if (pencilMode) {
            isDrawing = true;
            [lastX, lastY] = [
                (e.offsetX - canvasXOffset) / scaleFactor,
                (e.offsetY - canvasYOffset) / scaleFactor
            ];
        } else if (eraserMode) {
            isDrawing = true;
        } else {
            isDrawing = false;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) {
            if (pencilMode) {
                drawPath(e);
            } else if (eraserMode) {
                erasePath(e);
            }
        }
    });

    canvas.addEventListener('mouseup', () => stopDrawing());
    canvas.addEventListener('mouseout', () => stopDrawing());

    // === Text Handling ===
    document.getElementById('addTextButton').addEventListener('click', () => {
        addTextMode = true;
        eraserMode = false;
        pencilMode = false;
        setActiveTool('text');
        canvas.addEventListener('click', addTextHandler);
    });

    function addTextHandler(e) {
        createTextInput(
            (e.offsetX - canvasXOffset) / scaleFactor,
            (e.offsetY - canvasYOffset) / scaleFactor,
            ''
        );
        addTextMode = false;
        canvas.removeEventListener('click', addTextHandler);
    }

    function createTextInput(x, y, initialValue, textObj = null) {
        let font_size_ = font_size.value;
        const colorPicker = document.getElementById('color_picker').value;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = initialValue;
        input.placeholder = 'Enter text';
        input.style.position = 'absolute';
        input.style.left = `${x + canvas.offsetLeft}px`;
        input.style.top = `${y + canvas.offsetTop}px`;
        input.style.fontSize = font_size_;
        input.style.color = colorPicker;
        input.style.border = '1px solid #000';

        document.body.appendChild(input);
        input.focus();

        input.addEventListener('blur', () => {
            if (input.value.trim() !== '') {
                if (textObj) {
                    textObj.text = input.value;
                } else {
                    texts.push({ text: input.value, x, y, fontSize: font_size_, fontColor: colorPicker });
                    setLocalStorage();
                }
                redrawCanvas();
            }
            document.body.removeChild(input);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
    }

    function findTextAtPosition(x, y) {
        return texts.find(text => {
            // Set the canvas context font to match the current text properties for accurate measurement
            ctx.font = `${text.fontSize}px ${text.fontFamily || 'Arial'}`;

            // Measure text width and add dynamic padding
            const textWidth = ctx.measureText(text.text).width;
            const dynamicPadding = textWidth * 0.05; // Adjust the padding as needed (5% of text width)

            // Calculate text boundaries with padding
            const leftBoundary = (text.x * scaleFactor) + canvasXOffset - dynamicPadding;
            const rightBoundary = leftBoundary + textWidth + (2 * dynamicPadding);
            const topBoundary = (text.y * scaleFactor) + canvasYOffset - text.fontSize;
            const bottomBoundary = (text.y * scaleFactor) + canvasYOffset;


            // Check if the given (x, y) is within the text boundaries
            const isWithinXBounds = x >= leftBoundary && x <= rightBoundary;
            const isWithinYBounds = y >= topBoundary && y <= bottomBoundary;

            return isWithinXBounds && isWithinYBounds;
        });
    }




    // === Text Selection and Deletion ===
    let selectedText = null;

    function selectElement(x, y) {
        selectedText = findTextAtPosition(x, y);
        if (selectedText) {
            canvas.style.cursor = 'pointer';
            drawBorderAroundText(selectedText, 'red', false);
        }
        else {
            canvas.style.cursor = 'default';
            // redrawCanvas();
        }
    }

    function deleteSelected() {
        if (selectedText) {
            texts = texts.filter(text => text !== selectedText);
            setLocalStorage();
            selectedText = null;
            redrawCanvas();
        }
    }

    function drawBorderAroundText(text, color, clear) {
        if (clear) {
            redrawCanvas(); // Ensure this function clears the canvas appropriately
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.font = `${text.fontSize}px ${text.fontFamily || 'Arial'}`;

        // Measure the text width and set dynamic padding
        const textWidth = ctx.measureText(text.text).width;
        const dynamicPadding = textWidth * 0.05; // 5% of the text width as padding (adjust as needed)

        // Calculate rectangle parameters with dynamic padding
        const x = (text.x * scaleFactor) + canvasXOffset - dynamicPadding;
        const y = (text.y * scaleFactor) + canvasYOffset - text.fontSize + dynamicPadding;
        const width = textWidth + (dynamicPadding * 2);
        const height = text.fontSize;

        // Draw the border around the text with the dynamic padding
        ctx.strokeRect(x, y, width, height);
    }

    // Event listener for selecting text or paths
    canvas.addEventListener('click', (e) => {
        if (!pencilMode && !eraserMode) {
            selectElement(
                (e.offsetX - canvasXOffset) / scaleFactor,
                (e.offsetY - canvasYOffset) / scaleFactor
            );
            wasHoveringText = true;
        }
    });

    // Event listner for hover effect on text
    let wasHoveringText = false;

    canvas.addEventListener('mousemove', (e) => {
        if (!pencilMode && !eraserMode) {
            const x = (e.offsetX - canvasXOffset) / scaleFactor;
            const y = (e.offsetY - canvasYOffset) / scaleFactor;
            const text = findTextAtPosition(x, y);

            if (text) {
                if (!wasHoveringText) {
                    canvas.style.cursor = 'pointer';
                    drawBorderAroundText(text, 'blue', true);
                    wasHoveringText = true;
                }
            } else {
                if (wasHoveringText) {
                    canvas.style.cursor = 'default';
                    redrawCanvas();
                    wasHoveringText = false;
                }
            }
        }
    });

    // === Panning ===
    let isDragging = false;
    let startX, startY;

    canvas.addEventListener('mousedown', (e) => {
        if (!isDrawing && !pencilMode && !eraserMode) {
            isDragging = true;
            startX = e.offsetX;
            startY = e.offsetY;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = e.offsetX - startX;
            const dy = e.offsetY - startY;
            canvasXOffset += dx;
            canvasYOffset += dy;
            startX = e.offsetX;
            startY = e.offsetY;
            redrawCanvas();
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseout', () => {
        isDragging = false;
    });



    //Yaha se age comment lagana he
    // === Drawing Path Rendering ===
    function drawPaths() {
        drawingPaths.forEach(path => {
            ctx.beginPath();
            ctx.moveTo(path.startX * scaleFactor + canvasXOffset, path.startY * scaleFactor + canvasYOffset);
            ctx.lineTo(path.endX * scaleFactor + canvasXOffset, path.endY * scaleFactor + canvasYOffset);
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.size;
            ctx.lineCap = 'round';
            ctx.stroke();
        });
    }

    function drawTexts() {
        texts.forEach(text => {
            ctx.fillStyle = text.fontColor;
            ctx.font = `${text.fontSize * scaleFactor}px Arial`;
            ctx.fillText(text.text, (text.x * scaleFactor) + canvasXOffset, (text.y * scaleFactor) + canvasYOffset);
        });
    }



    // === Clear Canvas Button ===
    document.getElementById('clearButton').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        texts = [];
        drawingPaths = [];
        if (localStorage.getItem('isnotebook') === 'true') drawHorizontalLines();
        setLocalStorage();
    });

    // === Delete Key Listener for Text Deletion ===
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Delete') {
            deleteSelected();
        }
    });



    // === Eraser Size Adjustment ===
    document.getElementById('rubber_size').addEventListener('change', (e) => {
        eraserSize = e.target.value;
        if (eraserMode) {
            updateEraserCursor(eraserSize);
        }
    });

    function updateEraserCursor(size) {
        cursor.style.width = `${size}px`;
        cursor.style.height = `${size}px`;
        cursor.style.display = 'block';
        cursor.style.zIndex = -1;
    }

    // Canvas event listener for cursor positioning while erasing
    canvas.addEventListener('mousemove', (e) => {
        cursor.style.left = `${e.clientX - (eraserSize / 2)}px`;
        cursor.style.top = `${e.clientY - (eraserSize / 2)}px`;
    });

    // === Pencil Tool Button Toggle ===
    pencilButton.addEventListener('click', () => {
        pencilMode = !pencilMode;
        if (pencilMode) {
            setActiveTool('pencil');
        } else {
            resetToolState();
        }
    });

    // === Eraser Tool Button Toggle ===
    eraserButton.addEventListener('click', () => {
        pencilMode = false;
        eraserMode = !eraserMode;
        if (eraserMode) {
            setActiveTool('eraser');
            updateEraserCursor(eraserSize);
        } else {
            resetToolState();
        }
    });

    // === Initialize with previously saved drawing data ===
    redrawCanvas();



    // ===make navbar draggable===

    const nav = document.querySelector('#navbar');
    const navToggle = document.querySelector('#nav-toggle');




    let isNavDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    // Start dragging
    navToggle.addEventListener('mousedown', (e) => {
        isNavDragging = true;
        offsetX = e.clientX - nav.getBoundingClientRect().left;
        offsetY = e.clientY - nav.getBoundingClientRect().top;
        e.preventDefault();
    });

    const navItem = document.querySelector("#navbar div")

    // Handle dragging
    document.addEventListener('mousemove', (e) => {
        if (isNavDragging) {
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            // Get the current dimensions of the nav element
            const navWidth = nav.offsetWidth;
            const navHeight = nav.offsetHeight;

            // Constrain the new position within the bounds of the viewport
            // Ensure that the nav doesn't go past the left or top edges
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - navWidth));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - navHeight));

            // Move the nav element to the constrained position
            nav.style.left = `${newLeft}px`;
            nav.style.top = `${newTop}px`;


            // Check if the nav box hits the screen boundary (left, right, top, or bottom)
            const navRect = nav.getBoundingClientRect();
            // Check if any edge of the nav is at the boundary of the screen


            // If the nav box hits the left or right edge of the screen
            if (navRect.left <= 0) {
                navItem.classList.add('flex-col')

            } else if (navRect.right >= window.innerWidth - navRect.height) {
                console.log('right edge');
            }

            // If the nav box hits the top or bottom edge of the screen
            if (navRect.top <= 0) {
                navRect.left = 0;
                navItem.classList.remove('flex-col')
            } else if (navRect.bottom >= window.innerHeight - navRect.width) {
                console.log('bottom edge');
            }
        }
    });

    // Stop dragging
    document.addEventListener('mouseup', () => {
        isNavDragging = false;
    });

    const logoToggle = document.querySelector('#logoToggle');
    const colorPicker = document.getElementById('color_picker');
    const darkModeClass = 'dark-mode';

    // Apply dark or light mode based on local storage
    function applyMode(darkModeEnabled) {
        if (darkModeEnabled) {
            canvas.classList.add(darkModeClass);
            canvas.style.backgroundColor = '#374151'; // Dark background
            colorPicker.value = '#ffffff'; // Light text color for dark mode
        } else {
            canvas.classList.remove(darkModeClass);
            canvas.style.backgroundColor = '#DDE4E6'; // Light background
            colorPicker.value = '#000000'; // Dark text color for light mode
        }
        redrawCanvas();
    }

    // Initial setup on page load
    applyMode(localStorage.getItem('darkMode') === 'enabled');

    // Toggle dark mode and save state to local storage
    logoToggle.addEventListener('click', () => {
        const isDarkMode = canvas.classList.contains(darkModeClass);
        localStorage.setItem('darkMode', isDarkMode ? 'disabled' : 'enabled');
        applyMode(!isDarkMode);
    });

    var isnotebook = false;
    localStorage.setItem('isnotebook', isnotebook);

    // === Draw Horizontal Lines ===
    function drawHorizontalLines() {
        const lineSpacing = 35; // Adjust the spacing between lines as needed
        ctx.strokeStyle = localStorage.getItem('darkMode') === 'enabled' ? '#ffffff' : '#374151'; // Dark or light mode line color
        ctx.lineWidth = 1 * scaleFactor;

        const startY = Math.floor(-canvasYOffset / scaleFactor / lineSpacing) * lineSpacing;
        const endY = Math.ceil((canvas.height - canvasYOffset) / scaleFactor / lineSpacing) * lineSpacing;

        for (let y = startY; y <= endY; y += lineSpacing) {
            const posY = y * scaleFactor + canvasYOffset;
            ctx.beginPath();
            ctx.moveTo(0, posY);
            ctx.lineTo(canvas.width, posY);
            ctx.stroke();
        }
    }

    // Redraw the canvas
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPaths();
        drawTexts();
        if (isnotebook) drawHorizontalLines();
    }

    // Initial draw call
    redrawCanvas();

    document.getElementById('mode').addEventListener('click', () => {
        isnotebook = !isnotebook;
        localStorage.setItem('isnotebook', isnotebook);
        redrawCanvas();
    });


};