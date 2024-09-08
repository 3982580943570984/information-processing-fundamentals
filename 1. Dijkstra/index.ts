import cytoscape, {
	Core,
	CytoscapeOptions,
	EdgeCollection,
	EdgeDataDefinition,
	ElementDefinition,
	NodeCollection,
	NodeDataDefinition,
	NodeSingular,
} from 'cytoscape';
import * as dat from 'dat.gui';

const container: HTMLDivElement = document.getElementById('cy') as HTMLDivElement;

const cytoscapeOptions: CytoscapeOptions = {
	container: container,
	elements: [
		// Nodes
		{ data: { id: 'n1' } },
		{ data: { id: 'n2' } },

		// Edges
		{ data: { id: 'e1', source: 'n1', target: 'n2', weight: 3 } },
	],
	style: [
		{
			selector: 'node',
			style: {
				'text-valign': 'center',
				height: 40,
				label: 'data(id)',
				width: 40,
			},
		},
		{
			selector: 'edge',
			style: {
				'curve-style': 'bezier',
				'target-arrow-shape': 'triangle',
				'text-margin-y': -20,
				label: 'data(weight)',
				width: 2,
			},
		},
	],
	layout: {
		name: 'grid',
		rows: 1,
	},
	panningEnabled: false,
	zoomingEnabled: false,
	selectionType: 'single',
};

const cy: Core = cytoscape(cytoscapeOptions);

const selectedNodesInOrder: Set<NodeSingular> = new Set<NodeSingular>();

cy.on('select', 'node', (event) => selectedNodesInOrder.add(event.target as NodeSingular));

cy.on('unselect', 'node', (event) => selectedNodesInOrder.delete(event.target as NodeSingular));

const dijkstra = (source: NodeSingular) => {
	const distance: Map<NodeSingular, number> = new Map<NodeSingular, number>();
	const previous: Map<NodeSingular, NodeSingular | undefined> = new Map<NodeSingular, NodeSingular | undefined>();
	const queue: Set<NodeSingular> = new Set<NodeSingular>();

	cy.nodes().forEach((node) => {
		console.log('Node: ', node.id());
		node.neighborhood()
			.nodes()
			.forEach((node) => console.log('Neighbor node: ', node.id()));
	});

	cy.nodes()
		.filter((node) => node.neighborhood().edges().nonempty())
		.forEach((node) => {
			distance.set(node, Infinity);
			previous.set(node, undefined);
			queue.add(node);
		});

	distance.set(source, 0);

	while (queue.size !== 0) {
		let nodeWithMinDistance: NodeSingular | undefined = undefined;
		let minDistance = Infinity;

		queue.forEach((node: NodeSingular) => {
			const distanceToNode: number = distance.get(node) as number;

			if (distanceToNode >= minDistance) {
				return;
			}

			minDistance = distanceToNode;
			nodeWithMinDistance = node;
		});

		if (nodeWithMinDistance === undefined) {
			continue;
		}

		queue.delete(nodeWithMinDistance);

		(nodeWithMinDistance as NodeSingular)
			.neighborhood()
			.nodes()
			.forEach((neighbor) => {
				if (!queue.has(neighbor)) {
					return;
				}

				const edgeToNeighbor: EdgeCollection = (nodeWithMinDistance as NodeSingular).edgesWith(neighbor);

				const alternativeDistanceToNeighbor: number =
					distance.get(nodeWithMinDistance as NodeSingular) + edgeToNeighbor.data('weight');

				const previousDistanceToNeighbor: number = distance.get(neighbor) as number;

				if (alternativeDistanceToNeighbor >= previousDistanceToNeighbor) {
					return;
				}

				distance.set(neighbor, alternativeDistanceToNeighbor);
			});
	}

	return { distance, previous };
};

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
	shortestPath: () => {
		const selectedNodes = cy.nodes(':selected');
		if (selectedNodes.length !== 2) {
			return alert('Please select exactly two nodes to compute shortest path.');
		}

		const sourceNode: NodeSingular = selectedNodes.first() as NodeSingular;

		const targetNode: NodeSingular = selectedNodes.last() as NodeSingular;

		const { distance, previous } = dijkstra(sourceNode);

		console.log(distance.get(targetNode) as number);
		// alert(distance.get(targetNode) as number);
	},
};

const controlValues = {
	edgeWeight: 1,
};

// TODO: colorize shortest path

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
algorithmsFolder.add(controlFunctions, 'shortestPath').name('Dijkstra');
