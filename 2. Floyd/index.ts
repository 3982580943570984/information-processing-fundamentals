import cytoscape, { Core, CytoscapeOptions, EdgeCollection, EdgeDataDefinition, ElementDefinition, NodeCollection, NodeDataDefinition, NodeSingular } from 'cytoscape';
import * as dat from 'dat.gui'

interface PathfindingResults {
    from: string;
    to: string;
    path: string[];
    length: number;
}

interface AlgorithmResults {
    paths: PathfindingResults[];
    executionTime: number; 
}

let nodeIdCounter = 3;
let edgeIdCounter = 2;

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
                'label': 'data(weight)',  
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
    ],
	elements: [
		// Nodes
		{ data: { id: 'n1' } },
		{ data: { id: 'n2' } },

		// Edges
		{ data: { id: 'e1', source: 'n1', target: 'n2', weight: 3 } },
	],
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

        const weight = Math.trunc(controlValues.edgeWeight) as number;

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

const floyd = (): AlgorithmResults => {
    const nodes = cy.nodes();
    const edges = cy.edges();
    const nodeIds: string[] = nodes.map((node) => node.id());
    const n = nodeIds.length;

    const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
    const next: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));

    for (let i = 0; i < n; i++) {
        dist[i][i] = 0;
    }

    edges.forEach(edge => {
        const sourceIndex = nodeIds.indexOf(edge.source().id());
        const targetIndex = nodeIds.indexOf(edge.target().id());
        const weight = edge.data('weight') || 1;

        dist[sourceIndex][targetIndex] = weight;
        dist[targetIndex][sourceIndex] = weight;
        next[sourceIndex][targetIndex] = targetIndex;
        next[targetIndex][sourceIndex] = sourceIndex;
    });

    const startTime = performance.now();  // Начало замера времени

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

    const endTime = performance.now();  // Окончание замера времени
    const executionTime = endTime - startTime;  // Время выполнения

    const results: PathfindingResults[] = [];

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

    return { paths: results, executionTime };  
};

const dijkstra = (): AlgorithmResults => {
    const nodes = cy.nodes();
    const results: PathfindingResults[] = [];
    let totalExecutionTime = 0;  // Для накопления времени выполнения

    nodes.forEach((sourceNode: NodeSingular) => {
        const distance: Map<NodeSingular, number> = new Map<NodeSingular, number>();
        const previous: Map<NodeSingular, NodeSingular | undefined> = new Map<NodeSingular, NodeSingular | undefined>();
        const queue: Set<NodeSingular> = new Set<NodeSingular>();

        nodes.forEach((node: NodeSingular) => {
            distance.set(node, Infinity);
            previous.set(node, undefined);
            queue.add(node);
        });

        distance.set(sourceNode, 0);

        const startTime = performance.now();  // Начало замера времени

        while (queue.size !== 0) {
            let nodeWithMinDistance: NodeSingular | undefined = undefined;
            let minDistance = Infinity;

            queue.forEach((node: NodeSingular) => {
                const distToNode = distance.get(node)!;
                if (distToNode < minDistance) {
                    minDistance = distToNode;
                    nodeWithMinDistance = node;
                }
            });

            if (!nodeWithMinDistance) {
                break;
            }

            queue.delete(nodeWithMinDistance);

            nodeWithMinDistance.neighborhood('edge').forEach((edge) => {
                const neighbor = edge.connectedNodes().filter(node => node.id() !== nodeWithMinDistance.id()).first();

                if (!queue.has(neighbor)) {
                    return;
                }

                const alt = distance.get(nodeWithMinDistance)! + (edge.data('weight') || 1);

                if (alt < distance.get(neighbor)!) {
                    distance.set(neighbor, alt);
                    previous.set(neighbor, nodeWithMinDistance);
                }
            });
        }

        const endTime = performance.now();  // Окончание замера времени
        totalExecutionTime += endTime - startTime;  // Накопление времени выполнения

        // Формирование результатов для всех узлов, кроме самого себя
        nodes.forEach((targetNode: NodeSingular) => {
            if (sourceNode === targetNode) {
                return;
            }

            const path = [];
            let currentNode: NodeSingular | undefined = targetNode;

            while (currentNode && previous.get(currentNode)) {
                path.unshift(currentNode.id());
                currentNode = previous.get(currentNode);
            }

            if (path.length > 0) {
                path.unshift(sourceNode.id());

                results.push({
                    from: sourceNode.id(),
                    to: targetNode.id(),
                    path: path,
                    length: distance.get(targetNode)!
                });
            }
        });
    });

    return { paths: results, executionTime: totalExecutionTime };  
};

const display = (results: AlgorithmResults) => {
    const resultContainer = document.getElementById('result');

    // Проверка наличия контейнера для результатов
    if (!resultContainer) {
        console.error('Контейнер для результатов не найден.');
        return;
    }

    // Очищаем содержимое контейнера
    resultContainer.innerHTML = ''; 

    // Создаем таблицу
    const table = document.createElement('table');

    // Создаем заголовок таблицы
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

    // Создаем тело таблицы
    const tbody = document.createElement('tbody');

    // Добавляем результаты алгоритма
    results.paths.forEach(result => {
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

    // Добавляем строку с временем выполнения алгоритма
    const timeRow = document.createElement('tr');
    timeRow.innerHTML = `<td colspan="4">Время выполнения: ${results.executionTime.toFixed(2)} мс</td>`;
    tbody.appendChild(timeRow);

    // Добавляем tbody в таблицу
    table.appendChild(tbody);

    // Добавляем таблицу в контейнер результатов
    resultContainer.appendChild(table);
};

const controlValues = {
	edgeWeight: 1,
};

const findPaths = {
    floyd: () => {
        let results = floyd();
        console.log(results);
        display(results);
    },
    dijkstra: () =>{
        let results = dijkstra();
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
edgesFolder.add(controlValues, 'edgeWeight', 1, 100, 1).name('Weight');

const shortestPathFolder: dat.GUI = gui.addFolder('Find Paths');
shortestPathFolder.add(findPaths, 'floyd').name('Floyd');
shortestPathFolder.add(findPaths, 'dijkstra').name('Dijkstra');