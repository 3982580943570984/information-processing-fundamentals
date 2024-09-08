import cytoscape, { Core, CytoscapeOptions, EdgeCollection, EdgeDataDefinition, ElementDefinition, NodeCollection, NodeDataDefinition, NodeSingular } from 'cytoscape';
import * as dat from 'dat.gui'

let nodeIdCounter = 0;
let edgeIdCounter = 0;

const container: HTMLDivElement = document.getElementById('cy') as HTMLDivElement

const cytoscapeOptions: CytoscapeOptions = {
    container: container,
    layout: {
        name: 'grid',
        rows: 1
    },
    panningEnabled: false,
    zoomingEnabled: false,
    selectionType: 'single',
    style: [
        {
            selector: 'node',
            style: {
                'label': 'data(id)',
                'text-valign': 'center',
                'text-halign': 'center',
                'background-color': '#ffc0cb',
                'color': '#000',
                'font-size': '10px',
            }
        },
        {
            selector: 'edge',
            style: {
                'label': 'data(weight)',  // Отображение веса на ребре
                'width': 2,
                'line-color': '#ccc',
                'target-arrow-color': '#ccc',
                'target-arrow-shape': 'triangle'
            }
        },
        {
            selector: 'node:selected',
            style: {
                'background-color': '#b3dcfd'
            }
        },
        {
            selector: 'edge:selected',
            style: {
                'background-color': '#b3dcfd'
            }
        }
    ]
};

const cy: Core = cytoscape(cytoscapeOptions);

const controls = {
    addNode: () => {
        const id = `n${nodeIdCounter++}`;

        const nodeDataDefinition: NodeDataDefinition = {
            id: id,
        }

        const elementDefinition: ElementDefinition = {
            data: nodeDataDefinition,
        }

        cy.add(elementDefinition);
        cy.layout({ name: 'grid' }).run();
    },
    removeNode: () => {
        const selectedNodes: NodeCollection = cy.nodes(':selected');
        if (selectedNodes.length === 0) {
            return alert('Please select a node to remove.');
        }

        cy.remove(selectedNodes);
    },
    addEdge: () => {
        const selectedNodes: NodeCollection = cy.nodes(':selected');
        if (selectedNodes.length !== 2) {
            return alert('Please select exactly two nodes to create an edge.');
        }

        const sourceNode = selectedNodes.first() as NodeSingular;
        const targetNode = selectedNodes.last() as NodeSingular;

        const edgeAlreadyExists = sourceNode.edgesWith(targetNode).nonempty();
        if (edgeAlreadyExists) {
            return alert('An edge already exists between these nodes.');
        }

        const weight = parseFloat(prompt('Enter weight for this edge:', '1') as string);
        if (isNaN(weight) || weight <= 0) {
            return alert('Invalid weight. Please enter a positive number.');
        }

        const id = `e${edgeIdCounter++}`;
        const edgeDataDefinition: EdgeDataDefinition = {
            id: id,
            source: sourceNode.id(),
            target: targetNode.id(),
            weight: weight  // Добавляем вес ребра
        };

        const elementDataDefinition: ElementDefinition = {
            data: edgeDataDefinition
        }

        cy.add(elementDataDefinition);
    },
    removeEdge: () => {
        const selectedEdges: EdgeCollection = cy.edges(':selected');

        if (selectedEdges.length === 0) {
            return alert('Please select an edge to remove.');
        }

        cy.remove(selectedEdges);
    }
}

const floyd = () => {
    const nodes = cy.nodes();
    const edges = cy.edges();
    const nodeIds: string[] = nodes.map((node) => node.id());
    const n = nodeIds.length;

    // Инициализация матрицы расстояний и матрицы следующего узла
    const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
    const next: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
    // Инициализация начальных значений: расстояние от узла до самого себя = 0
    for (let i = 0; i < n; i++) {
        dist[i][i] = 0;
    }

    // Заполняем начальные значения расстояний для существующих рёбер
    edges.forEach(edge => {
        const sourceIndex = nodeIds.indexOf(edge.source().id());
        const targetIndex = nodeIds.indexOf(edge.target().id());
        const weight = edge.data('weight');  // Используем указанный вес ребра

        dist[sourceIndex][targetIndex] = weight;
        dist[targetIndex][sourceIndex] = weight;  // Если граф неориентированный
        next[sourceIndex][targetIndex] = targetIndex;
        next[targetIndex][sourceIndex] = sourceIndex;  // Если граф неориентированный
    });

    // Алгоритм Флойда-Уоршелла для нахождения кратчайших путей
    for (let k = 0; k < n; k++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (dist[i][j] > dist[i][k] + dist[k][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    next[i][j] = next[i][k];
                }
            }
        }
    }

    // Функция для восстановления пути из матрицы next
    const getPath = (startIndex: number, endIndex: number): number[] => {
        const path = [];
        if (next[startIndex][endIndex] === null) {
            return [];
        }
        let current = startIndex;
        while (current !== endIndex) {
            path.push(current);
            current = next[current][endIndex] as number;
        }
        path.push(endIndex);
        return path;
    };

    const results: { from: string, to: string, path: string[], length: number }[] = [];
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j && dist[i][j] !== Infinity) {
                const path = getPath(i, j).map(index => nodeIds[index]);
                results.push({
                    from: nodeIds[i],
                    to: nodeIds[j],
                    path: path,
                    length: dist[i][j]
                });
            }
        }
    }
    return results;
};

const display = (results: { from: string, to: string, path: string[], length: number }[]) => {
    const resultContainer = document.getElementById('result');
    resultContainer.innerHTML = ''; 

    const table = document.createElement('table');

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const headers = ['От', 'До', 'Маршрут', 'Длина'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    results.forEach(result => {
        const row = document.createElement('tr');

        const fromCell = document.createElement('td');
        fromCell.textContent = result.from;
        row.appendChild(fromCell);

        const toCell = document.createElement('td');
        toCell.textContent = result.to;
        row.appendChild(toCell);

        const pathCell = document.createElement('td');
        pathCell.textContent = result.path.join(' -> ');
        row.appendChild(pathCell);

        const lengthCell = document.createElement('td');
        lengthCell.textContent = result.length.toString();
        row.appendChild(lengthCell);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    resultContainer.appendChild(table);
};

const findPaths = {
    floyd: () => {
        let results = floyd();
        display(results);
    }
}

const gui: dat.GUI = new dat.GUI();

const nodesFolder: dat.GUI = gui.addFolder('Nodes');
nodesFolder.add(controls, 'addNode').name('Add Node');
nodesFolder.add(controls, 'removeNode').name('Remove Node');

const edgesFolder: dat.GUI = gui.addFolder('Edges');
edgesFolder.add(controls, 'addEdge').name('Add Edge');
edgesFolder.add(controls, 'removeEdge').name('Remove Edge');

const shortestPathFolder: dat.GUI = gui.addFolder('Find Paths');
shortestPathFolder.add(findPaths, 'floyd').name('Floyd');