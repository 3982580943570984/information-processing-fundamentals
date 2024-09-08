import cytoscape, {
	Core,
	CytoscapeOptions,
	EdgeCollection,
	EdgeDataDefinition,
	ElementDefinition,
	EventObject,
	NodeCollection,
	NodeDataDefinition,
	NodeSingular,
} from 'cytoscape';
import * as dat from 'dat.gui';

const adjacencyMatrixInput = document.getElementById('adjacencyMatrix') as HTMLTextAreaElement;
const generateGraphButton = document.getElementById('generateGraph') as HTMLButtonElement;
const container: HTMLDivElement = document.getElementById('cy') as HTMLDivElement;

generateGraphButton.addEventListener('click', () => {
	const matrixInput = adjacencyMatrixInput.value.trim();
	const adjacencyMatrix = parseAdjacencyMatrix(matrixInput);

	if (adjacencyMatrix === undefined) {
		return alert('Invalid adjacency matrix format.');
	}

	const { nodes, edges } = convertToGraph(adjacencyMatrix);
	renderGraph(nodes, edges);
});

const parseAdjacencyMatrix = (input: string): number[][] | undefined => {
	try {
		const rows = input.split('\n').map((row) => row.trim().split(/\s+/).map(Number));
		const size = rows.length;

		if (rows.some((row) => row.length !== size)) {
			throw new Error('The matrix must be square.');
		}

		if (rows.some((row) => row.some((weight) => weight < 0))) {
			throw new Error('The matrix must not store negative weights.');
		}

		if (rows.some((row) => row.some((weight) => !Number.isInteger(weight)))) {
			throw new Error('The matrix must not store non-integer weights.');
		}

		return rows;
	} catch (error) {
		console.error(error);
		return undefined;
	}
};

const convertToGraph = (
	matrix: number[][],
): {
	nodes: ElementDefinition[];
	edges: ElementDefinition[];
} => {
	const nodes: ElementDefinition[] = [];
	const edges: ElementDefinition[] = [];

	const size = matrix.length;

	// Create nodes
	for (let i = 0; i < size; i++) {
		nodes.push({ data: { id: `n${i}` } });
	}

	// Create edges
	for (let i = 0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			if (matrix[i][j] === 0) {
				continue;
			}

			edges.push({
				data: { source: `n${i}`, target: `n${j}`, weight: matrix[i][j] },
			});
		}
	}

	return { nodes, edges };
};

const renderGraph = (nodes: ElementDefinition[], edges: ElementDefinition[]) => {
	cy.elements().remove(); // Clear previous elements
	cy.add([...nodes, ...edges]); // Add new elements
	selectedNodesInOrder.clear();
	cy.layout({ name: 'grid', rows: 3 }).run(); // Apply layout
};

const cytoscapeOptions: CytoscapeOptions = {
	container: container,
	style: [
		{
			selector: 'node',
			style: {
				'text-valign': 'center',
				content: 'data(id)',
				width: 40,
				height: 40,
			},
		},
		{
			selector: 'edge',
			style: {
				content: 'data(weight)',
				'curve-style': 'bezier',
				'target-arrow-shape': 'triangle',
				width: 4,
				'text-margin-y': -20,
				'line-color': '#ddd',
				'target-arrow-color': '#ddd',
			},
		},
		{
			selector: '.highlighted',
			style: {
				'background-color': '#61bffc',
				'line-color': '#61bffc',
				'target-arrow-color': '#61bffc',
				'transition-property': 'background-color, line-color, target-arrow-color',
				'transition-duration': 0.5,
			},
		},
	],
	elements: [
		// Nodes
		{ data: { id: 'n1' } },
		{ data: { id: 'n2' } },

		// Edges
		{ data: { id: 'e1', source: 'n1', target: 'n2', weight: 3 } },
	],
	layout: {
		name: 'grid',
		rows: 1,
		padding: 10,
	},
	panningEnabled: false,
	zoomingEnabled: false,
	selectionType: 'single',
};

const cy: Core = cytoscape(cytoscapeOptions);

const selectedNodesInOrder: Set<NodeSingular> = new Set<NodeSingular>();

cy.on('select', 'node', (event: EventObject) => {
	selectedNodesInOrder.add(event.target as NodeSingular);
});

cy.on('unselect', 'node', (event: EventObject) => selectedNodesInOrder.delete(event.target as NodeSingular));

const dijkstra = (source: NodeSingular) => {
	const distance: Map<NodeSingular, number> = new Map<NodeSingular, number>();
	const previous: Map<NodeSingular, NodeSingular | undefined> = new Map<NodeSingular, NodeSingular | undefined>();
	const queue: Set<NodeSingular> = new Set<NodeSingular>();

	cy.nodes()
		.filter((node: NodeSingular) => node.neighborhood().edges().nonempty())
		.forEach((node: NodeSingular) => {
			distance.set(node, Infinity);
			previous.set(node, undefined);
			queue.add(node);
		});

	distance.set(source, 0);

	while (queue.size !== 0) {
		let nodeWithMinDistance: NodeSingular | undefined = undefined;
		let minDistance = Infinity;

		queue.forEach((node: NodeSingular) => {
			const distanceToNode: number = distance.get(node);

			if (distanceToNode >= minDistance) {
				return;
			}

			minDistance = distanceToNode;
			nodeWithMinDistance = node;
		});

		if (nodeWithMinDistance === undefined) {
			break; /// If no node is found, exit the loop.
		}

		queue.delete(nodeWithMinDistance);

		nodeWithMinDistance
			.neighborhood()
			.nodes()
			.forEach((neighbor) => {
				if (!queue.has(neighbor)) {
					return;
				}

				const edgeToNeighbor: EdgeCollection = nodeWithMinDistance.edgesTo(neighbor);

				if (edgeToNeighbor.empty()) {
					return;
				}

				const alternativeDistance = distance.get(nodeWithMinDistance) + edgeToNeighbor.data('weight');

				const currentDistance = distance.get(neighbor);

				if (!(alternativeDistance < currentDistance)) {
					return;
				}

				distance.set(neighbor, alternativeDistance);

				previous.set(neighbor, nodeWithMinDistance);
			});
	}

	return { distance, previous };
};

const getPathToTarget = (
	source: NodeSingular,
	target: NodeSingular,
	previous: Map<NodeSingular, NodeSingular | undefined>,
): NodeSingular[] => {
	const path: NodeSingular[] = [];
	let currentNode: NodeSingular | undefined = target;

	while (currentNode !== undefined && currentNode !== source) {
		path.push(currentNode);
		currentNode = previous.get(currentNode);
	}

	if (currentNode === source) {
		path.push(source);
	}

	return path.reverse();
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const controlFunctions = {
	addNode: () => {
		const id = `n${cy.nodes().length + 1}`;

		const nodeDataDefinition: NodeDataDefinition = {
			id: id,
		};

		const elementDefinition: ElementDefinition = {
			data: nodeDataDefinition,
		};

		cy.add(elementDefinition);

		cy.layout({ name: 'circle' }).run();
	},
	removeNode: () => {
		const selectedNodes: NodeCollection = cy.nodes(':selected');
		if (selectedNodes.length === 0) {
			return alert('Please select a node to remove.');
		}

		cy.remove(selectedNodes);
	},
	addEdge: () => {
		if (selectedNodesInOrder.size !== 2) {
			return alert('Please select exactly two nodes to create an edge.');
		}

		const selectedNodes: SetIterator<NodeSingular> = selectedNodesInOrder.values();

		const sourceNode = selectedNodes.next().value as NodeSingular;

		const targetNode = selectedNodes.next().value as NodeSingular;

		const edgeAlreadyExists = sourceNode.edgesWith(targetNode).nonempty();
		if (edgeAlreadyExists) {
			return alert('An edge already exists between these nodes.');
		}

		const weight = Math.trunc(controlValues.edgeWeight) as number;

		const edgeDataDefinition: EdgeDataDefinition = {
			source: sourceNode.id(),
			target: targetNode.id(),
			weight: weight,
		};

		const elementDataDefinition: ElementDefinition = {
			data: edgeDataDefinition,
		};

		cy.add(elementDataDefinition);
	},
	removeEdge: () => {
		const selectedEdges: EdgeCollection = cy.edges(':selected');

		if (selectedEdges.length === 0) {
			return alert('Please select an edge to remove.');
		}

		cy.remove(selectedEdges);
	},
	singleSourceShortestPath: async () => {
		if (selectedNodesInOrder.size !== 2) {
			return alert('Please select exactly two nodes to compute shortest path.');
		}

		cy.elements().removeClass('highlighted');

		await sleep(2000);

		const selectedNodes: SetIterator<NodeSingular> = selectedNodesInOrder.values();

		const sourceNode: NodeSingular = selectedNodes.next().value as NodeSingular;

		const targetNode: NodeSingular = selectedNodes.next().value as NodeSingular;

		const { distance, previous } = dijkstra(sourceNode);

		const distanceFromSourceToTarget = distance.get(targetNode);

		console.log(`Distance from ${sourceNode.id()} to ${targetNode.id()}: ${distanceFromSourceToTarget}`);

		if (distanceFromSourceToTarget === Infinity) {
			return;
		}

		const pathToTarget: NodeSingular[] = getPathToTarget(sourceNode, targetNode, previous);

		console.log(
			`Path from ${sourceNode.id()} to ${targetNode.id()}: `,
			pathToTarget.map((node) => node.id()),
		);

		const pathToTargetIterator: ArrayIterator<NodeSingular> = pathToTarget.values();

		const highlightPath = (previousNode: NodeSingular | undefined = undefined) => {
			const currentNode: NodeSingular = pathToTargetIterator.next().value;

			if (currentNode === undefined) return;

			if (previousNode !== undefined) {
				console.log(`Highlighting edge`);

				previousNode.edgesTo(currentNode).addClass('highlighted');
			}

			console.log(`Highlighting node with id: ${currentNode.id()}`);

			currentNode.addClass('highlighted');

			setTimeout(highlightPath, 1000, currentNode);
		};

		highlightPath();
	},
};

const controlValues = {
	edgeWeight: 1,
};

// TODO: fix graph highlighting

const gui: dat.GUI = new dat.GUI();

const nodesFolder: dat.GUI = gui.addFolder('Nodes');
nodesFolder.closed = false;
nodesFolder.add(controlFunctions, 'addNode').name('Add Node');
nodesFolder.add(controlFunctions, 'removeNode').name('Remove Node');

const edgesFolder: dat.GUI = gui.addFolder('Edges');
edgesFolder.closed = false;

const addEdgeFolder: dat.GUI = edgesFolder.addFolder('Add Edge');
addEdgeFolder.closed = false;
addEdgeFolder.add(controlValues, 'edgeWeight', 1, 100, 1).name('Weight');
addEdgeFolder.add(controlFunctions, 'addEdge').name('Add Edge');

edgesFolder.add(controlFunctions, 'removeEdge').name('Remove Edge');

const algorithmsFolder: dat.GUI = gui.addFolder('Algorithms');
algorithmsFolder.closed = false;
algorithmsFolder.add(controlFunctions, 'singleSourceShortestPath').name('Dijkstra');
