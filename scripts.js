let nodes = [];
let edges = [];
let adjacencyList = new Map();

let startNode = null;
let selectedNode = null;
let isRunning = false;
let isPaused = false;
let animationQueue = [];
let currentStep = 0;
let nodeIdCounter = 0;

const canvas = document.getElementById('graphCanvas');
const algorithmSelect = document.getElementById('algorithm');
const modeSelect = document.getElementById('mode');
const graphTypeSelect = document.getElementById('graphType');
const speedSlider = document.getElementById('speed');
const modeIndicator = document.getElementById('modeIndicator');
const orderList = document.getElementById('orderList');

const algoDescriptions = {
    bfs: {
        name: 'Breadth-First Search (BFS)',
        desc: 'BFS explores all neighbors at the current depth before moving to nodes at the next depth level. It uses a queue data structure and guarantees the shortest path in unweighted graphs. Time Complexity: O(V + E) | Space Complexity: O(V)'
    },
    dfs: {
        name: 'Depth-First Search (DFS)',
        desc: 'DFS explores as far as possible along each branch before backtracking. It uses a stack (or recursion) and is useful for topological sorting, cycle detection, and pathfinding. Time Complexity: O(V + E) | Space Complexity: O(V)'
    },
    dijkstra: {
        name: "Dijkstra's Algorithm",
        desc: "Dijkstra's algorithm finds the shortest path from a source node to all other nodes in a weighted graph with non-negative weights. It uses a priority queue for efficiency. Time Complexity: O((V + E) log V) | Space Complexity: O(V)"
    }
};

function init() {
    updateCanvasSize();
    setupEventListeners();
    updateStats();
}

function updateCanvasSize() {
    const container = canvas.parentElement;
    canvas.setAttribute('width', container.clientWidth);
    canvas.setAttribute('height', 600);
}

function setupEventListeners() {
    canvas.addEventListener('click', handleCanvasClick);

    algorithmSelect.addEventListener('change', () => {
        const algo = algorithmSelect.value;
        document.getElementById('algoName').textContent = algoDescriptions[algo].name;
        document.getElementById('algoDescription').textContent = algoDescriptions[algo].desc;
    });

    modeSelect.addEventListener('change', () => {
        modeIndicator.textContent = `Mode: ${modeSelect.options[modeSelect.selectedIndex].text}`;
        selectedNode = null;
        render();
    });

    speedSlider.addEventListener('input', () => {
        document.getElementById('speedValue').textContent = `${speedSlider.value}ms`;
    });

    document.getElementById('startBtn').addEventListener('click', startTraversal);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('stepBtn').addEventListener('click', stepTraversal);
    document.getElementById('resetBtn').addEventListener('click', resetTraversal);
    document.getElementById('clearBtn').addEventListener('click', clearGraph);
    document.getElementById('sampleBtn').addEventListener('click', loadSampleGraph);

    window.addEventListener('resize', () => {
        updateCanvasSize();
        render();
    });
}

function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mode = modeSelect.value;

    const clickedNode = findNodeAtPosition(x, y);

    switch (mode) {
        case 'addNode':
            if (!clickedNode) {
                addNode(x, y);
            }
            break;
        case 'addEdge':
            if (clickedNode) {
                handleEdgeCreation(clickedNode);
            }
            break;
        case 'setStart':
            if (clickedNode) {
                setStartNode(clickedNode);
            }
            break;
        case 'delete':
            if (clickedNode) {
                deleteNode(clickedNode);
            }
            break;
    }
}

function findNodeAtPosition(x, y) {
    return nodes.find(node => {
        const dx = node.x - x;
        const dy = node.y - y;
        return Math.sqrt(dx * dx + dy * dy) <= 25;
    });
}

function addNode(x, y) {
    const node = {
        id: nodeIdCounter++,
        x: x,
        y: y,
        state: 'unvisited',
        distance: Infinity,
        label: String.fromCharCode(65 + nodes.length % 26) + (nodes.length >= 26 ? Math.floor(nodes.length / 26) : '')
    };
    nodes.push(node);
    adjacencyList.set(node.id, []);
    updateStats();
    render();
}

function handleEdgeCreation(node) {
    if (!selectedNode) {
        selectedNode = node;
        render();
    } else if (selectedNode.id !== node.id) {
        if (algorithmSelect.value === 'dijkstra') {
            showWeightInput(selectedNode, node);
        } else {
            createEdge(selectedNode, node, 1);
        }
    }
}

function showWeightInput(from, to) {
    const weightContainer = document.getElementById('weightInput');
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    weightContainer.style.display = 'block';
    weightContainer.style.left = midX + 'px';
    weightContainer.style.top = midY + 'px';
    weightContainer.dataset.from = from.id;
    weightContainer.dataset.to = to.id;

    document.getElementById('edgeWeight').focus();
}

function confirmEdge() {
    const weightContainer = document.getElementById('weightInput');
    const weight = parseInt(document.getElementById('edgeWeight').value) || 1;
    const fromId = parseInt(weightContainer.dataset.from);
    const toId = parseInt(weightContainer.dataset.to);

    const fromNode = nodes.find(n => n.id === fromId);
    const toNode = nodes.find(n => n.id === toId);

    if (fromNode && toNode) {
        createEdge(fromNode, toNode, weight);
    }

    cancelEdge();
}

function cancelEdge() {
    document.getElementById('weightInput').style.display = 'none';
    selectedNode = null;
    render();
}

function createEdge(from, to, weight) {
    const existingEdge = edges.find(e =>
        (e.from === from.id && e.to === to.id) ||
        (graphTypeSelect.value === 'undirected' && e.from === to.id && e.to === from.id)
    );

    if (!existingEdge) {
        edges.push({ from: from.id, to: to.id, weight: weight, state: 'default' });
        adjacencyList.get(from.id).push({ node: to.id, weight: weight });

        if (graphTypeSelect.value === 'undirected') {
            adjacencyList.get(to.id).push({ node: from.id, weight: weight });
        }
    }

    selectedNode = null;
    updateStats();
    render();
}

function setStartNode(node) {
    startNode = node.id;
    render();
}

function deleteNode(node) {
    nodes = nodes.filter(n => n.id !== node.id);
    edges = edges.filter(e => e.from !== node.id && e.to !== node.id);
    adjacencyList.delete(node.id);

    adjacencyList.forEach((neighbors, key) => {
        adjacencyList.set(key, neighbors.filter(n => n.node !== node.id));
    });

    if (startNode === node.id) startNode = null;
    updateStats();
    render();
}

function updateStats() {
    document.getElementById('nodeCount').textContent = nodes.length;
    document.getElementById('edgeCount').textContent = edges.length;
}

function render() {
    canvas.innerHTML = '';

    edges.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (fromNode && toNode) {
            drawEdge(fromNode, toNode, edge);
        }
    });

    nodes.forEach(node => {
        drawNode(node);
    });

    if (selectedNode) {
        const node = nodes.find(n => n.id === selectedNode.id);
        if (node) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', node.x);
            circle.setAttribute('cy', node.y);
            circle.setAttribute('r', 30);
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', '#00d9ff');
            circle.setAttribute('stroke-width', '3');
            circle.setAttribute('stroke-dasharray', '5,5');
            canvas.appendChild(circle);
        }
    }
}

function drawNode(node) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    if (node.state === 'current' || node.id === startNode) {
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        glow.setAttribute('cx', node.x);
        glow.setAttribute('cy', node.y);
        glow.setAttribute('r', 35);
        glow.setAttribute('fill', node.state === 'current' ? 'rgba(255, 217, 61, 0.3)' : 'rgba(255, 107, 107, 0.3)');
        g.appendChild(glow);
    }

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', node.x);
    circle.setAttribute('cy', node.y);
    circle.setAttribute('r', 25);

    let color = '#4a5568';
    if (node.id === startNode) color = '#ff6b6b';
    else if (node.state === 'current') color = '#ffd93d';
    else if (node.state === 'inQueue') color = '#00d9ff';
    else if (node.state === 'visited') color = '#00ff88';

    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', '2');
    g.appendChild(circle);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', node.x);
    text.setAttribute('y', node.y + 5);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', node.state === 'current' ? '#000' : '#fff');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('font-size', '14');
    text.textContent = node.label;
    g.appendChild(text);

    if (algorithmSelect.value === 'dijkstra' && node.distance !== Infinity && node.state === 'visited') {
        const distText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        distText.setAttribute('x', node.x);
        distText.setAttribute('y', node.y - 35);
        distText.setAttribute('text-anchor', 'middle');
        distText.setAttribute('fill', '#ffd93d');
        distText.setAttribute('font-size', '12');
        distText.setAttribute('font-weight', 'bold');
        distText.textContent = `d=${node.distance}`;
        g.appendChild(distText);
    }

    canvas.appendChild(g);
}

function drawEdge(from, to, edge) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    const offsetX = (dx / length) * 25;
    const offsetY = (dy / length) * 25;

    const x1 = from.x + offsetX;
    const y1 = from.y + offsetY;
    const x2 = to.x - offsetX;
    const y2 = to.y - offsetY;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);

    let strokeColor = 'rgba(255, 255, 255, 0.3)';
    let strokeWidth = 2;
    if (edge.state === 'active') {
        strokeColor = '#ffd93d';
        strokeWidth = 4;
    } else if (edge.state === 'visited') {
        strokeColor = '#00ff88';
        strokeWidth = 3;
    }

    line.setAttribute('stroke', strokeColor);
    line.setAttribute('stroke-width', strokeWidth);
    g.appendChild(line);

    if (graphTypeSelect.value === 'directed') {
        const arrowSize = 10;
        const angle = Math.atan2(dy, dx);

        const arrowX = x2;
        const arrowY = y2;

        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const p1 = `${arrowX},${arrowY}`;
        const p2 = `${arrowX - arrowSize * Math.cos(angle - Math.PI/6)},${arrowY - arrowSize * Math.sin(angle - Math.PI/6)}`;
        const p3 = `${arrowX - arrowSize * Math.cos(angle + Math.PI/6)},${arrowY - arrowSize * Math.sin(angle + Math.PI/6)}`;

        arrow.setAttribute('points', `${p1} ${p2} ${p3}`);
        arrow.setAttribute('fill', strokeColor);
        g.appendChild(arrow);
    }

    if (edge.weight > 1 || algorithmSelect.value === 'dijkstra') {
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bg.setAttribute('cx', midX);
        bg.setAttribute('cy', midY);
        bg.setAttribute('r', 12);
        bg.setAttribute('fill', '#1a1a2e');
        bg.setAttribute('stroke', 'rgba(255,255,255,0.3)');
        g.appendChild(bg);

        const weightText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        weightText.setAttribute('x', midX);
        weightText.setAttribute('y', midY + 4);
        weightText.setAttribute('text-anchor', 'middle');
        weightText.setAttribute('fill', '#00d9ff');
        weightText.setAttribute('font-size', '11');
        weightText.setAttribute('font-weight', 'bold');
        weightText.textContent = edge.weight;
        g.appendChild(weightText);
    }

    canvas.insertBefore(g, canvas.firstChild);
}

function* bfs(start) {
    const visited = new Set();
    const queue = [start];

    while (queue.length > 0) {
        const current = queue.shift();

        if (visited.has(current)) continue;
        visited.add(current);

        yield { type: 'visit', node: current };

        const neighbors = adjacencyList.get(current) || [];
        for (const {node: neighbor} of neighbors) {
            if (!visited.has(neighbor)) {
                queue.push(neighbor);
                yield { type: 'enqueue', node: neighbor, edge: {from: current, to: neighbor} };
            }
        }
    }
}

function* dfs(start) {
    const visited = new Set();
    const stack = [start];

    while (stack.length > 0) {
        const current = stack.pop();

        if (visited.has(current)) continue;
        visited.add(current);

        yield { type: 'visit', node: current };

        const neighbors = adjacencyList.get(current) || [];
        for (const {node: neighbor} of [...neighbors].reverse()) {
            if (!visited.has(neighbor)) {
                stack.push(neighbor);
                yield { type: 'enqueue', node: neighbor, edge: {from: current, to: neighbor} };
            }
        }
    }
}

function* dijkstra(start) {
    const distances = new Map();
    const visited = new Set();
    const pq = [];

    nodes.forEach(node => distances.set(node.id, Infinity));
    distances.set(start, 0);
    pq.push({ node: start, dist: 0 });

    yield { type: 'setDistance', node: start, distance: 0 };

    while (pq.length > 0) {
        pq.sort((a, b) => a.dist - b.dist);
        const { node: current, dist } = pq.shift();

        if (visited.has(current)) continue;
        visited.add(current);

        yield { type: 'visit', node: current, distance: dist };

        const neighbors = adjacencyList.get(current) || [];
        for (const { node: neighbor, weight } of neighbors) {
            if (!visited.has(neighbor)) {
                const newDist = dist + weight;
                if (newDist < distances.get(neighbor)) {
                    distances.set(neighbor, newDist);
                    pq.push({ node: neighbor, dist: newDist });
                    yield { type: 'enqueue', node: neighbor, edge: {from: current, to: neighbor}, distance: newDist };
                }
            }
        }
    }
}

async function startTraversal() {
    if (startNode === null) {
        alert('Please set a start node first!');
        return;
    }

    if (isRunning) return;

    resetTraversal();
    isRunning = true;
    isPaused = false;

    const algo = algorithmSelect.value;
    let generator;

    switch (algo) {
        case 'bfs': generator = bfs(startNode); break;
        case 'dfs': generator = dfs(startNode); break;
        case 'dijkstra': generator = dijkstra(startNode); break;
    }

    for (const step of generator) {
        animationQueue.push(step);
    }

    await runAnimation();
}

async function runAnimation() {
    while (currentStep < animationQueue.length && isRunning) {
        if (isPaused) {
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
        }

        await executeStep(animationQueue[currentStep]);
        currentStep++;
        await new Promise(resolve => setTimeout(resolve, parseInt(speedSlider.value)));
    }

    if (currentStep >= animationQueue.length) {
        isRunning = false;
    }
}

async function executeStep(step) {
    const node = nodes.find(n => n.id === step.node);

    nodes.forEach(n => {
        if (n.state === 'current') n.state = 'visited';
    });

    if (step.type === 'visit') {
        if (node) {
            node.state = 'current';
            if (step.distance !== undefined) {
                node.distance = step.distance;
            }
            addToTraversalOrder(node.label);
        }

        if (step.edge) {
            const edge = edges.find(e =>
                (e.from === step.edge.from && e.to === step.edge.to) ||
                (graphTypeSelect.value === 'undirected' && e.from === step.edge.to && e.to === step.edge.from)
            );
            if (edge) edge.state = 'visited';
        }
    } else if (step.type === 'enqueue') {
        if (node && node.state === 'unvisited') {
            node.state = 'inQueue';
            if (step.distance !== undefined) {
                node.distance = step.distance;
            }
        }

        if (step.edge) {
            const edge = edges.find(e =>
                (e.from === step.edge.from && e.to === step.edge.to) ||
                (graphTypeSelect.value === 'undirected' && e.from === step.edge.to && e.to === step.edge.from)
            );
            if (edge) edge.state = 'active';
        }
    } else if (step.type === 'setDistance') {
        if (node) {
            node.distance = step.distance;
        }
    }

    render();
}

function addToTraversalOrder(label) {
    const item = document.createElement('span');
    item.className = 'order-item';
    item.textContent = label;
    orderList.appendChild(item);
}

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? '▶ Resume' : '⏸ Pause';
}

async function stepTraversal() {
    if (animationQueue.length === 0 && startNode !== null) {
        resetTraversal();
        isRunning = true;
        isPaused = true;

        const algo = algorithmSelect.value;
        let generator;

        switch (algo) {
            case 'bfs': generator = bfs(startNode); break;
            case 'dfs': generator = dfs(startNode); break;
            case 'dijkstra': generator = dijkstra(startNode); break;
        }

        for (const step of generator) {
            animationQueue.push(step);
        }
    }

    if (currentStep < animationQueue.length) {
        await executeStep(animationQueue[currentStep]);
        currentStep++;
    }
}

function resetTraversal() {
    isRunning = false;
    isPaused = false;
    currentStep = 0;
    animationQueue = [];

    nodes.forEach(node => {
        node.state = 'unvisited';
        node.distance = Infinity;
    });

    edges.forEach(edge => {
        edge.state = 'default';
    });

    orderList.innerHTML = '';
    document.getElementById('pauseBtn').textContent = '⏸ Pause';
    render();
}

function clearGraph() {
    nodes = [];
    edges = [];
    adjacencyList.clear();
    startNode = null;
    selectedNode = null;
    nodeIdCounter = 0;
    resetTraversal();
    updateStats();
    render();
}

function loadSampleGraph() {
    clearGraph();

    const sampleNodes = [
        { x: 200, y: 100 },
        { x: 100, y: 250 },
        { x: 300, y: 250 },
        { x: 50, y: 400 },
        { x: 200, y: 400 },
        { x: 350, y: 400 },
        { x: 500, y: 200 },
        { x: 600, y: 350 }
    ];

    sampleNodes.forEach(pos => addNode(pos.x, pos.y));

    const sampleEdges = [
        [0, 1, 4], [0, 2, 2],
        [1, 3, 5], [1, 4, 1],
        [2, 4, 3], [2, 5, 6],
        [2, 6, 2], [4, 5, 2],
        [6, 7, 4], [5, 7, 3]
    ];

    sampleEdges.forEach(([from, to, weight]) => {
        const fromNode = nodes[from];
        const toNode = nodes[to];
        createEdge(fromNode, toNode, weight);
    });

    startNode = nodes[0].id;
    render();
}

window.onload = init;