import { EdgeCollection, NodeCollection, NodeSingular } from 'cytoscape';

type GraphInstance = {
	nodes: NodeCollection;
	edges: EdgeCollection;
};

const dijkstra = (graph: GraphInstance, source: NodeSingular) => {
	const distance = new Map<NodeSingular, number>();
	const previous = new Map<NodeSingular, NodeSingular | undefined>();
	const queue = new Set<NodeSingular>();

	graph.nodes
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
			const distanceToNode = distance.get(node) as number;

			if (distanceToNode >= minDistance) {
				return;
			}

			minDistance = distanceToNode;
			nodeWithMinDistance = node;
		});

		if (nodeWithMinDistance === undefined) {
			break;
		}

		queue.delete(nodeWithMinDistance);

		(nodeWithMinDistance as NodeSingular)
			.neighborhood()
			.nodes()
			.forEach((neighbor) => {
				if (!queue.has(neighbor)) {
					return;
				}

				const edgeToNeighbor: EdgeCollection = (nodeWithMinDistance as NodeSingular).edgesTo(neighbor);

				if (edgeToNeighbor.empty()) {
					return;
				}

				const alternativeDistance =
					distance.get(nodeWithMinDistance as NodeSingular) + edgeToNeighbor.data('weight');

				const currentDistance = distance.get(neighbor) as number;

				if (!(alternativeDistance < currentDistance)) {
					return;
				}

				distance.set(neighbor, alternativeDistance);

				previous.set(neighbor, nodeWithMinDistance);
			});
	}

	return { distance, previous };
};

const getPathToTargetDijkstra = (
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

export type { GraphInstance as GraphForDijkstra };

export { getPathToTargetDijkstra };

export default dijkstra;
