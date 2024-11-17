window.onload = function () {
    // Elements
    const elements = {
        cursor: document.getElementById('cursor'),
        pencilButton: document.getElementById('pencilButton'),
        eraserButton: document.getElementById('eraserButton'),
        canvas: document.getElementById('drawingCanvas'),
        addTextButton: document.getElementById('addTextButton'),
        font_size: document.getElementById('font_size'),
        handGrab: document.getElementById('handButton'),
        zoomInButton: document.getElementById('zoomInButton'),
        zoomOutButton: document.getElementById('zoomOutButton'),
        clearButton: document.getElementById('clearButton'),
        rubber_size: document.getElementById('rubber_size'),
        nav: document.querySelector('#navbar'),
        navToggle: document.querySelector('#nav-toggle'),
        logoToggle: document.querySelector('#logoToggle'),
        colorPicker: document.getElementById('color_picker'),
        modeButton: document.getElementById('mode')
    };

    const ctx = elements.canvas.getContext('2d');

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
    elements.canvas.width = window.innerWidth;
    elements.canvas.height = window.innerHeight;

    // === Tool Selection ===
    function setActiveTool(tool) {
        resetToolState();
        switch (tool) {
            case 'pencil':
                pencilMode = true;
                elements.pencilButton.classList.add('bg-indigo-600');
                elements.eraserButton.classList.remove('bg-indigo-600');
                elements.addTextButton.classList.remove('bg-indigo-600');
                elements.cursor.style.display = 'none';
                elements.canvas.classList.add('cursor-crosshair');
                break;
            case 'eraser':
                eraserMode = true;
                elements.eraserButton.classList.add('bg-indigo-600');
                elements.pencilButton.classList.remove('bg-indigo-600');
                elements.addTextButton.classList.remove('bg-indigo-600');
                elements.cursor.style.display = 'block';
                break;
            case 'text':
                addTextMode = true;
                elements.addTextButton.classList.add('bg-indigo-600');
                elements.eraserButton.classList.remove('bg-indigo-600');
                elements.pencilButton.classList.remove('bg-indigo-600');
                elements.cursor.style.display = 'none';
                elements.canvas.classList.add('cursor-text');
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
        ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
        drawPaths();
        drawTexts();
        if (isnotebook) drawHorizontalLines();
    }

    // === Undo and Redo ===

    let undoStack = [];
    let redoStack = [];

    function saveState() {
        // Create a snapshot of current state
        const currentState = {
            texts: JSON.parse(JSON.stringify(texts)),
            drawingPaths: JSON.parse(JSON.stringify(drawingPaths))
        };

        // Add to undo stack
        undoStack.push(currentState);


        // Clear redo stack when new action is performed
        redoStack = [];
    }

    function undo() {
        if (undoStack.length === 0) return;

        // Save current state to redo stack
        const currentState = {
            texts: JSON.parse(JSON.stringify(texts)),
            drawingPaths: JSON.parse(JSON.stringify(drawingPaths))
        };
        redoStack.push(currentState);

        // Restore previous state
        const previousState = undoStack.pop();
        texts = previousState.texts;
        drawingPaths = previousState.drawingPaths;

        // Update storage and redraw
        setLocalStorage();
        redrawCanvas();
    }

    function redo() {
        if (redoStack.length === 0) return;

        // Save current state to undo stack
        const currentState = {
            texts: JSON.parse(JSON.stringify(texts)),
            drawingPaths: JSON.parse(JSON.stringify(drawingPaths))
        };
        undoStack.push(currentState);

        // Restore next state
        const nextState = redoStack.pop();
        texts = nextState.texts;
        drawingPaths = nextState.drawingPaths;

        // Update storage and redraw
        setLocalStorage();
        redrawCanvas();
    }

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

    // === Drawing and Erasing ===
    function drawPath(e) {
        const colorPicker = elements.colorPicker.value;
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
        saveState(); // Save state after drawing
        setLocalStorage();
        lastX = path.endX;
        lastY = path.endY;
        redrawCanvas();
    }

    function erasePath(e) {
        const mouseX = (e.offsetX - canvasXOffset) / scaleFactor;
        const mouseY = (e.offsetY - canvasYOffset) / scaleFactor;
        const originalLength = drawingPaths.length;
        drawingPaths = drawingPaths.filter((path) => {
            return !(Math.abs(path.startX - mouseX) < eraserSize && Math.abs(path.startY - mouseY) < eraserSize);
        });

        // Only save state if something was actually erased
        if (originalLength !== drawingPaths.length) {
            saveState();
            setLocalStorage();
        }
        redrawCanvas();
    }

    function stopDrawing() {
        isDrawing = false;
    }

    // === Text Handling ===
    function addTextHandler(e) {
        createTextInput(
            (e.offsetX - canvasXOffset) / scaleFactor,
            (e.offsetY - canvasYOffset) / scaleFactor,
            ''
        );
        addTextMode = false;
        elements.addTextButton.classList.remove('bg-indigo-600');
        resetToolState();
        elements.canvas.removeEventListener('click', addTextHandler);
    }

    function createTextInput(x, y, initialValue, textObj = null) {
        let font_size_ = elements.font_size.value;
        const colorPicker = elements.colorPicker.value;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = initialValue;
        input.placeholder = 'Enter text';
        input.style.position = 'absolute';
        input.style.left = `${x + elements.canvas.offsetLeft}px`;
        input.style.top = `${y + elements.canvas.offsetTop}px`;
        input.style.fontSize = font_size_ + 'px';
        input.style.color = colorPicker;
        input.style.border = '1px solid #1F2937';
        input.style.outline = 'none';
        input.style.padding = '5px';
        input.style.backgroundColor = 'transparent';

        document.body.appendChild(input);
        input.focus();

        input.addEventListener('blur', () => {
            if (input.value.trim() !== '') {
                if (textObj) {
                    textObj.text = input.value;
                } else {
                    texts.push({
                        text: input.value,
                        x,
                        y,
                        fontSize: font_size_,
                        fontColor: colorPicker,
                        fontFamily: 'Arial'
                    });
                    saveState(); // Save state after adding text
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
            ctx.font = `${text.fontSize}px ${text.fontFamily || 'Arial'}`;
            const textWidth = ctx.measureText(text.text).width * scaleFactor;
            const textHeight = text.fontSize * 1.2 * scaleFactor; // Adjust height to account for text padding
            const leftBoundary = (text.x) + canvasXOffset;
            const rightBoundary = leftBoundary + textWidth;
            const topBoundary = (text.y) + canvasYOffset - textHeight;
            const bottomBoundary = (text.y) + canvasYOffset;
            const isWithinXBounds = x >= leftBoundary && x <= rightBoundary;
            const isWithinYBounds = y >= topBoundary && y <= bottomBoundary;
            return isWithinXBounds && isWithinYBounds;
        });
    }

    function drawBorderAroundText(text, color, clear) {
        if (clear) {
            redrawCanvas();
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.font = `${text.fontSize}px ${text.fontFamily || 'Arial'}`;
        const textWidth = ctx.measureText(text.text).width * scaleFactor;
        const textHeight = text.fontSize * 1.2 * scaleFactor; // Adjust height to account for text padding
        const x = (text.x * scaleFactor) + canvasXOffset;
        const y = (text.y * scaleFactor) + canvasYOffset - textHeight;
        const width = textWidth;
        const height = textHeight;
        ctx.strokeRect(x, y, width, height);
    }

    // === Text Selection and Deletion ===
    let selectedText = null;

    function selectElement(x, y) {
        selectedText = findTextAtPosition(x, y);
        if (selectedText) {
            elements.canvas.style.cursor = 'pointer';
            drawBorderAroundText(selectedText, 'red', false);
        } else {
            elements.canvas.style.cursor = 'default';
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

    // function drawBorderAroundText(text, color, clear) {
    //     if (clear) {
    //         redrawCanvas();
    //     }
    //     ctx.strokeStyle = color;
    //     ctx.lineWidth = 1;
    //     ctx.font = `${text.fontSize}px ${text.fontFamily || 'Arial'}`;
    //     const textWidth = ctx.measureText(text.text).width;
    //     const dynamicPadding = textWidth * 0.05;
    //     const x = (text.x * scaleFactor) + canvasXOffset - dynamicPadding;
    //     const y = (text.y * scaleFactor) + canvasYOffset - text.fontSize + dynamicPadding;
    //     const width = textWidth + (dynamicPadding * 2);
    //     const height = text.fontSize;
    //     ctx.strokeRect(x, y, width, height);
    // }

    // === Panning ===
    let isDragging = false;
    let startX, startY;

    function startDragging(e) {
        isDragging = true;
        startX = e.offsetX;
        startY = e.offsetY;
    }

    function handleDragging(e) {
        if (isDragging) {
            const dx = e.offsetX - startX;
            const dy = e.offsetY - startY;
            canvasXOffset += dx;
            canvasYOffset += dy;
            startX = e.offsetX;
            startY = e.offsetY;
            redrawCanvas();
        }
    }

    function stopDragging() {
        isDragging = false;
    }

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
    elements.clearButton.addEventListener('click', () => {
        saveState(); // Save state before clearing
        ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
        texts = [];
        drawingPaths = [];
        if (localStorage.getItem('isnotebook') === 'true') drawHorizontalLines();
        setLocalStorage();
    });

    // === Eraser Size Adjustment ===
    elements.rubber_size.addEventListener('change', (e) => {
        eraserSize = e.target.value;
        if (eraserMode) {
            updateEraserCursor(eraserSize);
        }
    });

    function updateEraserCursor(size) {
        elements.cursor.style.width = `${size}px`;
        elements.cursor.style.height = `${size}px`;
        elements.cursor.style.display = 'block';
        elements.cursor.style.zIndex = -1;
    }

    // === Pencil Tool Button Toggle ===
    elements.pencilButton.addEventListener('click', () => {
        pencilMode = !pencilMode;
        if (pencilMode) {
            setActiveTool('pencil');
        } else {
            elements.pencilButton.classList.remove('bg-indigo-600');
            resetToolState();
        }
    });

    // === Eraser Tool Button Toggle ===
    elements.eraserButton.addEventListener('click', () => {
        pencilMode = false;
        eraserMode = !eraserMode;
        if (eraserMode) {
            setActiveTool('eraser');
            updateEraserCursor(eraserSize);
        } else {
            elements.eraserButton.classList.remove('bg-indigo-600');
            resetToolState();
        }
    });

    // === Initialize with previously saved drawing data ===
    redrawCanvas();

    // === Make Navbar Draggable ===
    let isNavDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    elements.navToggle.addEventListener('mousedown', (e) => {
        isNavDragging = true;
        offsetX = e.clientX - elements.nav.getBoundingClientRect().left;
        offsetY = e.clientY - elements.nav.getBoundingClientRect().top;
        e.preventDefault();
    });

    const navItem = document.querySelector("#navbar div");

    document.addEventListener('mousemove', (e) => {
        if (isNavDragging) {
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;
            const navWidth = elements.nav.offsetWidth;
            const navHeight = elements.nav.offsetHeight;
            newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - navWidth));
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - navHeight));
            elements.nav.style.left = `${newLeft}px`;
            elements.nav.style.top = `${newTop}px`;
            const navRect = elements.nav.getBoundingClientRect();
            if (navRect.left <= 0) {
                navItem.classList.add('flex-col');
            } else if (navRect.right >= window.innerWidth - navRect.height) {
                console.log('right edge');
            }
            if (navRect.top <= 0) {
                navRect.left = 0;
                navItem.classList.remove('flex-col');
            } else if (navRect.bottom >= window.innerHeight - navRect.width) {
                console.log('bottom edge');
            }
        }
    });

    document.addEventListener('mouseup', () => {
        isNavDragging = false;
    });

    // === Dark Mode Toggle ===
    const darkModeClass = 'dark-mode';

    function applyMode(darkModeEnabled) {
        if (darkModeEnabled) {
            elements.canvas.classList.add(darkModeClass);
            elements.canvas.style.backgroundColor = '#374151';
            elements.colorPicker.value = '#ffffff';
        } else {
            elements.canvas.classList.remove(darkModeClass);
            elements.canvas.style.backgroundColor = '#DDE4E6';
            elements.colorPicker.value = '#000000';
        }
        redrawCanvas();
    }

    applyMode(localStorage.getItem('darkMode') === 'enabled');

    elements.logoToggle.addEventListener('click', () => {
        const isDarkMode = elements.canvas.classList.contains(darkModeClass);
        localStorage.setItem('darkMode', isDarkMode ? 'disabled' : 'enabled');
        applyMode(!isDarkMode);
    });

    var isnotebook = false;
    localStorage.setItem('isnotebook', isnotebook);

    // === Draw Horizontal Lines ===
    function drawHorizontalLines() {
        const lineSpacing = 35;
        ctx.strokeStyle = localStorage.getItem('darkMode') === 'enabled' ? '#ffffff' : '#374151';
        ctx.lineWidth = 1 * scaleFactor;
        const startY = Math.floor(-canvasYOffset / scaleFactor / lineSpacing) * lineSpacing;
        const endY = Math.ceil((elements.canvas.height - canvasYOffset) / scaleFactor / lineSpacing) * lineSpacing;
        for (let y = startY; y <= endY; y += lineSpacing) {
            const posY = y * scaleFactor + canvasYOffset;
            ctx.beginPath();
            ctx.moveTo(0, posY);
            ctx.lineTo(elements.canvas.width, posY);
            ctx.stroke();
        }
    }

    elements.modeButton.addEventListener('click', () => {
        isnotebook = !isnotebook;
        localStorage.setItem('isnotebook', isnotebook);
        redrawCanvas();
    });

    // Event Listeners
    elements.handGrab.addEventListener('click', () => {
        pencilMode = false;
        eraserMode = false;
        addTextMode = false;
        elements.canvas.classList.add('cursor-grab');
        elements.canvas.style.cursor = 'grab';
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === '+') {
            applyZoom(1 + zoomIncrement);
        } else if (e.key === '-') {
            applyZoom(1 - zoomIncrement);
        } else if (e.ctrlKey && e.key === 'z') {
            e.preventDefault(); // Prevent browser's default undo
            undo();
        } else if (e.ctrlKey && e.key === 'y') {
            e.preventDefault(); // Prevent browser's default redo
            redo();
        } else if (e.key === 'Delete') {
            deleteSelected();
        }
    });

    const keysPressed = {};
    window.addEventListener('keyup', (e) => {
        delete keysPressed[e.key];
    });

    elements.zoomInButton.addEventListener('click', () => applyZoom(1 + zoomIncrement));
    elements.zoomOutButton.addEventListener('click', () => applyZoom(1 - zoomIncrement));
    elements.addTextButton.addEventListener('click', () => {
        addTextMode = true;
        eraserMode = false;
        pencilMode = false;
        setActiveTool('text');
        elements.canvas.addEventListener('click', addTextHandler);
    });

    elements.canvas.addEventListener('mousedown', (e) => {
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

    elements.canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) {
            if (pencilMode) {
                drawPath(e);
            } else if (eraserMode) {
                erasePath(e);
            }
        }
    });

    elements.canvas.addEventListener('mouseup', () => stopDrawing());
    elements.canvas.addEventListener('mouseout', () => stopDrawing());

    elements.canvas.addEventListener('click', (e) => {
        if (!pencilMode && !eraserMode) {
            selectElement(
                (e.offsetX - canvasXOffset) / scaleFactor,
                (e.offsetY - canvasYOffset) / scaleFactor
            );
            wasHoveringText = true;
        }
    });

    let wasHoveringText = false;

    elements.canvas.addEventListener('mousemove', (e) => {
        if (!pencilMode && !eraserMode) {
            const x = (e.offsetX - canvasXOffset) / scaleFactor;
            const y = (e.offsetY - canvasYOffset) / scaleFactor;
            const text = findTextAtPosition(x, y);
            if (text) {
                if (!wasHoveringText) {
                    elements.canvas.style.cursor = 'pointer';
                    drawBorderAroundText(text, 'blue', true);
                    wasHoveringText = true;
                }
            } else {
                if (wasHoveringText) {
                    elements.canvas.style.cursor = 'default';
                    redrawCanvas();
                    wasHoveringText = false;
                }
            }
        }
    });

    elements.canvas.addEventListener('mousedown', (e) => {
        if (!isDrawing && !pencilMode && !eraserMode) {
            startDragging(e);
        }
    });

    elements.canvas.addEventListener('mousemove', (e) => {
        handleDragging(e);
    });

    elements.canvas.addEventListener('mouseup', () => {
        stopDragging();
    });

    elements.canvas.addEventListener('mouseout', () => {
        stopDragging();
    });
};