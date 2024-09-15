import { EdgeCollection, NodeCollection, NodeSingular } from 'cytoscape';

type GraphInstance = {
	nodes: NodeCollection;
	edges: EdgeCollection;
};

const floydWarshall = (graph: GraphInstance) => {
	const nodes = graph.nodes.toArray(); // Получаем массив всех узлов

	// Инициализируем матрицу расстояний и предков
	const distance = new Map<NodeSingular, Map<NodeSingular, number>>();
	const previous = new Map<NodeSingular, Map<NodeSingular, NodeSingular | undefined>>();

	// Инициализация
	nodes.forEach((node) => {
		const distMap = new Map<NodeSingular, number>();
		const prevMap = new Map<NodeSingular, NodeSingular | undefined>();

		nodes.forEach((targetNode) => {
			if (node.id() === targetNode.id()) {
				distMap.set(targetNode, 0);
				prevMap.set(targetNode, undefined);
				return;
			}

			const edge = node.edgesTo(targetNode).first();
			if (edge) {
				distMap.set(targetNode, edge.data('weight'));
				prevMap.set(targetNode, node);
				return;
			}

			distMap.set(targetNode, Infinity);
			prevMap.set(targetNode, undefined);
		});

		distance.set(node, distMap);
		previous.set(node, prevMap);
	});

	// Основной алгоритм Флойда-Уоршелла
	nodes.forEach((k) => {
		nodes.forEach((i) => {
			nodes.forEach((j) => {
				const distIK = distance.get(i)?.get(k) ?? Infinity;
				const distKJ = distance.get(k)?.get(j) ?? Infinity;
				const currentDist = distance.get(i)?.get(j) ?? Infinity;

				if (distIK + distKJ < currentDist) {
					distance.get(i)?.set(j, distIK + distKJ);
					previous.get(i)?.set(j, previous.get(k)?.get(j));
				}
			});
		});
	});

	return { distance, previous };
};

const getPathToTargetFloydWarshall = (
	source: NodeSingular,
	target: NodeSingular,
	previous: Map<NodeSingular, Map<NodeSingular, NodeSingular | undefined>>,
): NodeSingular[] => {
	const path: NodeSingular[] = [];
	let currentNode: NodeSingular | undefined = target;

	while (currentNode) {
		path.unshift(currentNode); // Добавляем в начало пути
		currentNode = previous.get(source)?.get(currentNode); // Переходим к предыдущему узлу
		if (currentNode === source) {
			path.unshift(source); // Добавляем исходный узел в начало пути
			break;
		}
	}

	return path;
};

export { getPathToTargetFloydWarshall };

export default floydWarshall;
