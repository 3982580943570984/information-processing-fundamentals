'use client';

import { EdgeCollection, NodeCollection, NodeSingular } from 'cytoscape';
import { button, useControls } from 'leva';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import dijkstra, { getPathToTargetDijkstra } from '../algorithms/dijkstra';
import floydWarshall, { getPathToTargetFloydWarshall } from '../algorithms/floyd_warshall';
import { RoutingTableContext } from '../contexts/routing_table';
import { CyInstanceRefContext, EhInstanceRefContext, GraphElementsContext } from './cytoscape_graph';

type Packet = {
	id: number;
	source: NodeSingular;
	target: NodeSingular;
	current: NodeSingular;
	visited: Set<string>;
	timeToLive: number;
};

let nextPacketId = 0;

const ControlPanel: React.FC = () => {
	const [, setDrawMode] = useState(false);
	const [edgeWeight, setEdgeWeight] = useState(1);

	const [dijkstraTextAreaValue, setDijkstraTextAreaValue] = useState<string>('');
	const [floydWarshallTextAreaValue, setFloydWarshallTextAreaValue] = useState<string>('');

	const { graphElements, setGraphElements, selectedGraphElements, setSelectedGraphElements } =
		useContext(GraphElementsContext);

	const cyInstanceRef = useContext(CyInstanceRefContext);
	const ehInstanceRef = useContext(EhInstanceRefContext);

	const routingTableContext = useContext(RoutingTableContext);

	if (!routingTableContext) {
		throw new Error('ControlPanel must be used within a RoutingTableProvider');
	}

	const { routingTable, updateRoutingTable } = routingTableContext;

	const highlightPath = useCallback(
		(pathToTarget: ArrayIterator<NodeSingular>, previousNode: NodeSingular | undefined = undefined) => {
			const currentNode = pathToTarget.next().value;

			if (currentNode === undefined) {
				return;
			}

			if (previousNode !== undefined) {
				const edgesFromPreviousToCurrent = previousNode.edgesTo(currentNode);

				let minWeightForEdgesFromPreviousToCurrent = Infinity;
				edgesFromPreviousToCurrent.edges().forEach((edge) => {
					const edgeWeight = edge.data('weight');

					if (edgeWeight < minWeightForEdgesFromPreviousToCurrent) {
						minWeightForEdgesFromPreviousToCurrent = edgeWeight;
					}
				});

				edgesFromPreviousToCurrent.forEach((edge) => {
					if (edge.data('weight') === minWeightForEdgesFromPreviousToCurrent) {
						edge.addClass('highlighted');
					}
				});
			}

			currentNode.addClass('highlighted');

			setTimeout(() => highlightPath(pathToTarget, currentNode), 1000);
		},
		[],
	);

	const animatePacket = useCallback(
		(source: NodeSingular, target: NodeSingular, packetId: number) => {
			if (!cyInstanceRef.current) return Promise.reject(new Error('Cytoscape instance not available'));

			const sourcePosition = source.position();
			let startTime: number | null = null;
			const duration = 2000;

			return new Promise<void>((resolve) => {
				if (cyInstanceRef.current === null) return resolve();

				const packet = cyInstanceRef.current.add({
					data: { label: `${packetId}` },
					position: { ...sourcePosition },
					classes: 'packet',
				});

				const moveStep = (now: number) => {
					if (startTime === null) startTime = now;
					const elapsed = now - startTime;

					const newTargetPosition = target.position();
					const progress = Math.min(elapsed / duration, 1);

					const currentX = sourcePosition.x + progress * (newTargetPosition.x - sourcePosition.x);
					const currentY = sourcePosition.y + progress * (newTargetPosition.y - sourcePosition.y);

					packet.position({ x: currentX, y: currentY });

					if (progress < 1) {
						requestAnimationFrame(moveStep);
						return;
					}

					packet.remove();
					resolve();
				};

				requestAnimationFrame(moveStep);
			});
		},
		[cyInstanceRef.current],
	);

	const refreshRoutingTable = useCallback(() => {
		if (!cyInstanceRef.current) return;

		cyInstanceRef.current.nodes().forEach((node) => {
			updateRoutingTable(node.id(), node.id(), 0);

			node
				.connectedEdges()
				.targets()
				.filter((neighbor) => node.id() !== neighbor.id())
				.forEach((neighbor) => {
					updateRoutingTable(node.id(), neighbor.id(), 1);
				});
		});
	}, [cyInstanceRef.current]);

	useEffect(() => refreshRoutingTable(), [graphElements, refreshRoutingTable]);

	const randomWalkRouting = useCallback(
		async (packet: Packet) => {
			if (packet.current === packet.target) return;

			if (packet.timeToLive === 0) return;

			const neighbors = packet.current
				.connectedEdges()
				.targets()
				.filter((node) => node.id() !== packet.source.id())
				.nodes();

			if (neighbors.length === 0) return;

			let neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
			while (neighbor.id() === packet.current.id()) {
				neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
			}

			await Promise.all([animatePacket(packet.current, neighbor, packet.id)]);

			const newPacket: Packet = {
				...packet,
				current: neighbor,
				visited: new Set(packet.visited),
				timeToLive: packet.timeToLive - 1,
			};

			return randomWalkRouting(newPacket);
		},
		[animatePacket],
	);

	const floodingRouting = useCallback(
		async (packet: Packet) => {
			if (packet.current === packet.target) return;

			if (packet.timeToLive === 0) return;

			const neighbors = packet.current
				.connectedEdges()
				.targets()
				.filter((node) => node.id() !== packet.source.id())
				.nodes();

			if (neighbors.length === 0) return;

			// Создаем массив промисов для параллельной обработки
			const promises = neighbors.map(async (neighbor) => {
				if (packet.visited.has(neighbor.id())) return;

				const updatedVisited = new Set(packet.visited);
				updatedVisited.add(neighbor.id());

				// Анимация пакета и рекурсивный вызов floodingRouting для нового пакета
				await animatePacket(packet.current, neighbor, packet.id);

				const newPacket: Packet = {
					...packet,
					current: neighbor,
					visited: updatedVisited,
					timeToLive: packet.timeToLive - 1,
				};

				// Рекурсивный вызов для соседнего узла
				return floodingRouting(newPacket);
			});

			// Ожидаем завершения всех анимаций и рекурсивных вызовов
			await Promise.all(promises);
		},
		[animatePacket],
	);

	const experienceBasedRouting = useCallback(
		async (packet: Packet) => {
			if (!cyInstanceRef.current) return console.warn('cyInstanceRef.current is null');

			if (packet.current.id() === packet.target.id())
				return console.log(`Packet ${packet.id} has arrived at destination ${packet.target.id()}`);

			packet.visited.add(packet.current.id());

			const packetPathArray = Array.from(packet.visited);
			const currentRouterId = packet.current.id();

			for (let i = 0; i < packetPathArray.length - 1; i++) {
				const routerId = packetPathArray[i];
				const hops = packetPathArray.length - i - 1;

				updateRoutingTable(currentRouterId, routerId, hops);
				console.log(`Router ${currentRouterId}: Updated routing entry to ${routerId} with ${hops} hops`);
			}

			const nextHops: NodeSingular[] = [];
			let minHops: number = Infinity;

			const neighbors = packet.current
				.connectedEdges()
				.targets()
				.filter((node) => node.id() !== packet.current.id());

			neighbors.forEach((neighbor) => {
				if (packet.visited.has(neighbor.id())) return;

				const neighborRoutingTable = routingTable.get(neighbor.id());

				console.log(`neighborRoutingTable: ${neighborRoutingTable}`);

				if (neighborRoutingTable === undefined) return;

				const hopsToDest = neighborRoutingTable.get(packet.target.id());

				console.log(`hopsToDest: ${hopsToDest}`);

				if (hopsToDest === undefined) return;

				if (hopsToDest > minHops) return;

				if (hopsToDest < minHops) nextHops.length = 0;

				minHops = hopsToDest;
				nextHops.push(neighbor);
			});

			if (packet.current.id() === 'n3') {
				console.log(minHops, nextHops);
			}

			if (nextHops.length === 0) {
				for (const neighbor of neighbors) {
					if (packet.visited.has(neighbor.id())) continue;

					nextHops.push(neighbor);
				}
			}

			if (nextHops.length === 0)
				return console.log(`Router ${currentRouterId}: No available neighbors to forward the packet`);

			const nextHop = nextHops[Math.floor(Math.random() * nextHops.length)];

			await animatePacket(packet.current, nextHop, packet.id);

			const newPacket: Packet = {
				...packet,
				current: nextHop,
				visited: new Set(packet.visited),
			};

			return experienceBasedRouting(newPacket);
		},
		[animatePacket, routingTable, updateRoutingTable, cyInstanceRef],
	);

	useControls(
		'Действия с графами',
		{
			'Добавить вершину': button(() => {
				setGraphElements((previousGraphElements) => ({
					nodes: [...previousGraphElements.nodes, { data: { label: `n${previousGraphElements.nodes.length + 1}` } }],
					edges: previousGraphElements.edges,
				}));
			}),
			'Удалить вершину': button(() => {
				setSelectedGraphElements((previousSelectedGraphElements) => {
					const selectedNodeIds = previousSelectedGraphElements.nodes.map((node) => node.id());
					setGraphElements((previousGraphElements) => ({
						nodes: previousGraphElements.nodes.filter((node) => !selectedNodeIds.includes(node.data.id as string)),
						edges: previousGraphElements.edges.filter(
							(edge) => !selectedNodeIds.includes(edge.data.source) && !selectedNodeIds.includes(edge.data.target),
						),
					}));
					return previousSelectedGraphElements;
				});
			}),
			'Вес ребра': {
				value: edgeWeight,
				min: 1,
				max: 25,
				step: 1,
				onEditEnd(value) {
					setEdgeWeight(() => value);
				},
			},
			'Добавить ребро': button(() => {
				setSelectedGraphElements((previousSelectedGraphElements) => {
					if (previousSelectedGraphElements.nodes.length !== 2) {
						alert('Пожалуйста, выберите ровно две вершины для создания ребра');
						return previousSelectedGraphElements;
					}

					const [sourceNode, targetNode] = previousSelectedGraphElements.nodes;

					setGraphElements((previousGraphElements) => {
						// const edgeAlreadyExists = previousGraphElements.edges.some(
						// 	(edge) => edge.data.source === sourceNode.id() && edge.data.target === targetNode.id(),
						// );

						// if (edgeAlreadyExists) {
						// 	alert('Ребро между вершинами уже существует');
						// 	return previousGraphElements;
						// }

						return {
							nodes: previousGraphElements.nodes,
							edges: [
								...previousGraphElements.edges,
								{
									data: {
										source: sourceNode.id(),
										target: targetNode.id(),
										weight: edgeWeight,
									},
								},
							],
						};
					});

					return previousSelectedGraphElements;
				});
			}),
			'Удалить ребро': button(() => {
				setSelectedGraphElements((previousSelectedGraphElements) => {
					const selectedEdgeIds = previousSelectedGraphElements.edges.map((edge) => edge.id());
					setGraphElements((previousGraphElements) => ({
						nodes: previousGraphElements.nodes,
						edges: previousGraphElements.edges.filter((edge) => !selectedEdgeIds.includes(edge.data.id as string)),
					}));
					return previousSelectedGraphElements;
				});
			}),
			'Переключить режим рисования': button(() => {
				const ehInstance = ehInstanceRef?.current;
				if (ehInstance === null) {
					return console.warn('ehInstance is null');
				}

				setDrawMode((prevDrawMode) => {
					const newDrawMode = !prevDrawMode;

					newDrawMode === true ? ehInstance.enableDrawMode() : ehInstance.disableDrawMode();

					return newDrawMode;
				});
			}),
		},
		{ collapsed: true },
		[edgeWeight],
	);

	useControls(
		'Примеры графов',
		{
			'Простой граф': button(() => {
				setGraphElements(() => ({
					nodes: [
						{ data: { id: 'n1', label: 'n1' } },
						{ data: { id: 'n2', label: 'n2' } },
						{ data: { id: 'n3', label: 'n3' } },
					],
					edges: [
						{ data: { id: 'e1', source: 'n1', target: 'n2', weight: 3 } },
						{ data: { id: 'e2', source: 'n2', target: 'n3', weight: 5 } },
					],
				}));
			}),
			'Средний граф': button(() => {
				setGraphElements(() => ({
					nodes: [
						{ data: { id: 'n1', label: 'n1' } },
						{ data: { id: 'n2', label: 'n2' } },
						{ data: { id: 'n3', label: 'n3' } },
						{ data: { id: 'n4', label: 'n4' } },
					],
					edges: [
						{ data: { id: 'e1', source: 'n1', target: 'n2', weight: 3 } },
						{ data: { id: 'e2', source: 'n2', target: 'n3', weight: 5 } },
						{ data: { id: 'e3', source: 'n4', target: 'n3', weight: 4 } },
						{ data: { id: 'e4', source: 'n4', target: 'n2', weight: 2 } },
					],
				}));
			}),
			'Сложный граф': button(() => {
				setGraphElements(() => ({
					nodes: [
						{ data: { id: 'n1', label: 'n1' } },
						{ data: { id: 'n2', label: 'n2' } },
						{ data: { id: 'n3', label: 'n3' } },
						{ data: { id: 'n4', label: 'n4' } },
						{ data: { id: 'n5', label: 'n5' } },
						{ data: { id: 'n6', label: 'n6' } },
						{ data: { id: 'n7', label: 'n7' } },
					],
					edges: [
						{ data: { id: 'e1', source: 'n1', target: 'n2', weight: 3 } },
						{ data: { id: 'e2', source: 'n2', target: 'n3', weight: 5 } },
						{ data: { id: 'e3', source: 'n3', target: 'n4', weight: 2 } },
						{ data: { id: 'e4', source: 'n4', target: 'n5', weight: 4 } },
						{ data: { id: 'e5', source: 'n5', target: 'n6', weight: 1 } },
						{ data: { id: 'e6', source: 'n6', target: 'n7', weight: 7 } },
						{ data: { id: 'e7', source: 'n7', target: 'n3', weight: 6 } },
						{ data: { id: 'e8', source: 'n2', target: 'n5', weight: 8 } },
						{ data: { id: 'e9', source: 'n4', target: 'n6', weight: 3 } },
					],
				}));
			}),
			'Случайный граф': button(() => {
				const generateRandomGraph = (numNodes: number, numEdges: number) => {
					const nodes = [];
					const edges = [];

					for (let i = 1; i <= numNodes; i++) {
						nodes.push({ data: { id: `n${i}`, label: `n${i}` } });
					}

					for (let i = 0; i < numEdges; i++) {
						const source = `n${Math.ceil(Math.random() * numNodes)}`;
						let target = `n${Math.ceil(Math.random() * numNodes)}`;

						while (target === source) {
							target = `n${Math.ceil(Math.random() * numNodes)}`;
						}

						const weight = Math.floor(Math.random() * 25) + 1;
						edges.push({ data: { source, target, weight } });
					}

					return { nodes, edges };
				};

				const numNodes = Math.floor(Math.random() * 10) + 5;
				const numEdges = Math.floor(Math.random() * 10) + 5;
				const randomGraph = generateRandomGraph(numNodes, numEdges);

				setGraphElements(randomGraph);
			}),
		},
		{ collapsed: true },
	);

	useControls(
		'Сортировка графов',
		{
			Circle: button(() => cyInstanceRef.current?.layout({ name: 'circle' }).run()),
			Random: button(() => cyInstanceRef.current?.layout({ name: 'random' }).run()),
			Cose: button(() => cyInstanceRef.current?.layout({ name: 'cose' }).run()),
			Breadthfirst: button(() => cyInstanceRef.current?.layout({ name: 'breadthfirst' }).run()),
			Concentric: button(() => cyInstanceRef.current?.layout({ name: 'concentric' }).run()),
		},
		{
			collapsed: true,
		},
	);

	useControls(
		'Поиск кратчайшего пути',
		{
			'Алгоритм Дейкстры': button(() => {
				setSelectedGraphElements((previousSelectedGraphElements) => {
					if (cyInstanceRef.current === null) {
						console.warn('cyInstanceRef.current is null');
						return previousSelectedGraphElements;
					}

					if (previousSelectedGraphElements.nodes.length !== 2) {
						alert('Пожалуйста, выберите ровно две вершины для использования алгоритма Дейкстры');
						return previousSelectedGraphElements;
					}

					const [nodes, edges] = [cyInstanceRef.current.nodes(), cyInstanceRef.current.edges()];

					const [source, target] = previousSelectedGraphElements.nodes;

					const { distance, previous } = dijkstra({ nodes, edges }, source);

					const distanceFromSourceToTarget = distance.get(target);

					console.log(`Dijkstra: distance from ${source.id()} to ${target.id()}: ${distanceFromSourceToTarget}`);

					const pathToTarget: NodeSingular[] = getPathToTargetDijkstra(source, target, previous);

					console.log(`Dijkstra: path from ${source.id()} to ${target.id()}: ${pathToTarget.map((node) => node.id())}`);

					cyInstanceRef.current.elements().unselect();

					if (pathToTarget.length !== 1) {
						highlightPath(pathToTarget.values());
					} else {
						alert('Путь между вершинами отсутствует');
					}

					return previousSelectedGraphElements;
				});
			}),
			'Алгоритм Флойда — Уоршелла': button(() => {
				setSelectedGraphElements((previousSelectedGraphElements) => {
					if (cyInstanceRef.current === null) {
						console.warn('cyInstanceRef.current is null');
						return previousSelectedGraphElements;
					}

					if (previousSelectedGraphElements.nodes.length !== 2) {
						alert('Пожалуйста, выберите ровно две вершины для использования алгоритма Флойда - Уоршелла');
						return previousSelectedGraphElements;
					}

					const [nodes, edges] = [cyInstanceRef.current.nodes(), cyInstanceRef.current.edges()];

					const [source, target] = previousSelectedGraphElements.nodes;

					const { distance, previous } = floydWarshall({ nodes, edges });

					const distanceFromSourceToTarget = distance.get(source)?.get(target);

					console.log(`Floyd-Warshall: distance from ${source.id()} to ${target.id()}: ${distanceFromSourceToTarget}`);

					const pathToTarget: NodeSingular[] = getPathToTargetFloydWarshall(source, target, previous);

					console.log(
						`Floyd-Warshall: path from ${source.id()} to ${target.id()}: ${pathToTarget.map((node) => node.id())}`,
					);

					cyInstanceRef.current.elements().unselect();

					if (pathToTarget.length !== 1) {
						highlightPath(pathToTarget.values());
					}

					return previousSelectedGraphElements;
				});
			}),
			'Сравнить алгоритмы': button(() => {
				if (cyInstanceRef.current === null) {
					return console.warn('cyInstanceRef.current is null');
				}

				const [nodes, edges] = [cyInstanceRef.current.nodes(), cyInstanceRef.current.edges()];

				// Замеры алгоритма Дейкстры
				let dijkstraTime = 0;
				const dijkstraDistance: Map<NodeSingular, number>[] = [];
				const dijkstraPrevious: Map<NodeSingular, NodeSingular | undefined>[] = [];

				const runDijkstra = (nodes: NodeCollection, edges: EdgeCollection, source: NodeSingular) => {
					const startTime = performance.now();
					const { distance, previous } = dijkstra({ nodes, edges }, source);
					const endTime = performance.now();

					dijkstraDistance.push(distance); // Добавляем результат без использования setState
					dijkstraPrevious.push(previous); // То же для previous
					dijkstraTime += endTime - startTime;
				};

				nodes.forEach((source) => runDijkstra(nodes, edges, source));

				let dijkstraText = `Время исполнения алгоритма: ${dijkstraTime.toPrecision(7)} миллисекунд\n\n`;

				nodes.forEach((source, index) => {
					nodes.forEach((target) => {
						if (source !== target) {
							const distanceFromSourceToTarget = dijkstraDistance[index].get(target);
							const pathToTarget: NodeSingular[] = getPathToTargetDijkstra(source, target, dijkstraPrevious[index]);

							if (distanceFromSourceToTarget !== undefined && distanceFromSourceToTarget !== Infinity) {
								dijkstraText += `Кратчайший путь между ${source.id()} и ${target.id()}: ${pathToTarget
									.map((node) => node.id())
									.join(' -> ')}, Дистанция: ${distanceFromSourceToTarget}\n`;
							} else {
								dijkstraText += `Путь между ${source.id()} и ${target.id()} не найден\n`;
							}
						}
					});
				});

				setDijkstraTextAreaValue(dijkstraText); // Обновляем только текстовое поле

				// Замеры алгоритма Флойда - Уоршелла
				let floydWarshallTime = 0;
				let floydWarshallDistance: Map<NodeSingular, Map<NodeSingular, number>> | undefined;
				let floydWarshallPrevious: Map<NodeSingular, Map<NodeSingular, NodeSingular | undefined>> | undefined;

				const runFloydWarshall = (nodes: NodeCollection, edges: EdgeCollection) => {
					const startTime = performance.now();
					const { distance, previous } = floydWarshall({ nodes, edges });
					const endTime = performance.now();

					floydWarshallDistance = distance; // Сохраняем результат в переменные
					floydWarshallPrevious = previous;
					floydWarshallTime = endTime - startTime;
				};

				runFloydWarshall(nodes, edges);

				let floydWarshallText = `Время исполнения алгоритма: ${floydWarshallTime.toPrecision(7)} миллисекунд\n\n`;

				nodes.forEach((source) => {
					nodes.forEach((target) => {
						if (source !== target) {
							const distanceFromSourceToTarget = floydWarshallDistance?.get(source)?.get(target);
							const pathToTarget: NodeSingular[] = getPathToTargetFloydWarshall(source, target, floydWarshallPrevious!);

							if (distanceFromSourceToTarget !== undefined) {
								floydWarshallText += `Кратчайший путь между ${source.id()} и ${target.id()}: ${pathToTarget
									.map((node) => node.id())
									.join(' -> ')}, Дистанция: ${distanceFromSourceToTarget}\n`;
							} else {
								floydWarshallText += `Путь между ${source.id()} и ${target.id()} не найден\n`;
							}
						}
					});
				});

				setFloydWarshallTextAreaValue(floydWarshallText); // Обновляем только текстовое поле
			}),
		},
		{
			collapsed: true,
		},
	);

	useControls(
		'Алгоритмы маршрутизации',
		{
			Случайная: button(async () => {
				if (cyInstanceRef.current === null) return console.warn('cyInstanceRef.current is null');

				if (selectedGraphElements.nodes.length !== 2)
					return alert('Пожалуйста, выберите ровно две вершины для алгоритма случайной маршрутизации');

				const [source, target] = selectedGraphElements.nodes;

				const packet: Packet = {
					id: nextPacketId++,
					source: source,
					target: target,
					current: source,
					visited: new Set(),
					timeToLive: 5,
				};

				await randomWalkRouting(packet);
			}),
			Лавинная: button(async () => {
				if (cyInstanceRef.current === null) return console.warn('cyInstanceRef.current is null');

				if (selectedGraphElements.nodes.length !== 2)
					return alert('Пожалуйста, выберите ровно две вершины для алгоритма лавинной маршрутизации');

				const [source, target] = selectedGraphElements.nodes;

				const packet: Packet = {
					id: nextPacketId++,
					source: source,
					target: target,
					current: source,
					visited: new Set(),
					timeToLive: 5,
				};

				await floodingRouting(packet);
			}),
			'По предыдущему опыту': button(async () => {
				if (cyInstanceRef.current === null) return console.warn('cyInstanceRef.current is null');

				if (selectedGraphElements.nodes.length !== 2)
					return alert('Пожалуйста, выберите ровно две вершины для алгоритма маршрутизации по опыту');

				const [source, target] = selectedGraphElements.nodes;

				const packet: Packet = {
					id: nextPacketId++,
					source: source,
					target: target,
					current: source,
					visited: new Set(),
					timeToLive: 10,
				};

				refreshRoutingTable();

				await experienceBasedRouting(packet);
			}),
		},
		[selectedGraphElements, randomWalkRouting, floodingRouting, experienceBasedRouting],
	);

	return (
		<Rnd
			default={{
				x: 10,
				y: 200,
				width: 330,
				height: 180,
			}}
			bounds={'parent'}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					border: '1px solid #333',
					width: '100%',
					height: '100%',
					overflow: 'hidden',
					color: '#fff',
					backgroundColor: '#181a1e',
					borderRadius: '10px',
					boxShadow: '0 0 9px 0 #00000088',
				}}
			>
				<label
					style={{
						display: 'block',
						marginTop: '10px',
						marginBottom: '10px',
						fontWeight: 'bold',
						textAlign: 'center',
						color: 'white',
					}}
				>
					Сравнение алгоритмов
				</label>
				<table style={{ width: '100%', position: 'relative', flexGrow: 1 }}>
					<thead>
						<tr>
							<th
								style={{
									border: '1px solid #444',
									padding: '8px',
									textAlign: 'center',
									backgroundColor: '#23272a',
									width: '50%',
								}}
							>
								Дейкстра
							</th>
							<th
								style={{
									border: '1px solid #444',
									padding: '8px',
									textAlign: 'center',
									backgroundColor: '#23272a',
									width: '50%',
								}}
							>
								Флойд - Уоршелл
							</th>
						</tr>
					</thead>
					<tbody style={{ height: '100px', backgroundColor: '#aeaeae' }}>
						<tr>
							<td style={{ width: '50%', padding: '0', position: 'relative' }}>
								<textarea
									disabled
									style={{
										width: '100%',
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										boxSizing: 'border-box',
										overflow: 'hidden',
										position: 'absolute',
										resize: 'none',
										backgroundColor: '#2c2f33',
										color: '#fff',
									}}
									value={dijkstraTextAreaValue}
								/>
							</td>
							<td style={{ width: '50%', padding: '0', position: 'relative' }}>
								<textarea
									disabled
									style={{
										width: '100%',
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										boxSizing: 'border-box',
										overflow: 'hidden',
										position: 'absolute',
										resize: 'none',
										backgroundColor: '#2c2f33',
										color: '#fff',
									}}
									value={floydWarshallTextAreaValue}
								/>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</Rnd>
	);
};

export default ControlPanel;
