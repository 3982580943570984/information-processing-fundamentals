'use client';

import cytoscape, {
	Core,
	CytoscapeOptions,
	EdgeDefinition,
	EdgeSingular,
	EventObject,
	NodeDefinition,
	NodeSingular,
} from 'cytoscape';
import edgehandles, { EdgeHandlesInstance, EdgeHandlesOptions } from 'cytoscape-edgehandles';
import { createContext, MutableRefObject, useEffect, useRef, useState } from 'react';
import { RoutingTableProvider } from '../contexts/routing_table';
import AdjacencyMatrix from './adjacency_matrix';
import ControlPanel from './control_panel';
import RoutingTable from './routing_table';

type GraphElements = {
	nodes: NodeDefinition[];
	edges: EdgeDefinition[];
};

type SelectedGraphElements = {
	nodes: NodeSingular[];
	edges: EdgeSingular[];
};

type GraphElementsState = {
	graphElements: GraphElements;
	setGraphElements: React.Dispatch<React.SetStateAction<GraphElements>>;
	selectedGraphElements: SelectedGraphElements;
	setSelectedGraphElements: React.Dispatch<React.SetStateAction<SelectedGraphElements>>;
};

const GraphElementsContext = createContext<GraphElementsState>({
	graphElements: { nodes: [], edges: [] },
	setGraphElements: () => {},
	selectedGraphElements: { nodes: [], edges: [] },
	setSelectedGraphElements: () => {},
});

const CyInstanceRefContext = createContext<MutableRefObject<Core | null>>({ current: null });

const EhInstanceRefContext = createContext<MutableRefObject<EdgeHandlesInstance | null>>({ current: null });

const CytoscapeGraph: React.FC = () => {
	const [graphElements, setGraphElements] = useState<GraphElements>({
		nodes: [{ data: { id: 'n1', label: 'n1' } }, { data: { id: 'n2', label: 'n2' } }],
		edges: [{ data: { id: 'e1', source: 'n1', target: 'n2', weight: 3 } }],
	});
	const [selectedGraphElements, setSelectedGraphElements] = useState<SelectedGraphElements>({
		nodes: [],
		edges: [],
	});

	const cyRef = useRef<HTMLDivElement>(null);
	const cyInstanceRef = useRef<Core | null>(null);
	const ehInstanceRef = useRef<EdgeHandlesInstance | null>(null);

	// Эффект при первом рендере для инициализации библиотеки
	useEffect(() => {
		cytoscape.use(edgehandles);

		// Определяем опции для `cytoscape`
		const cyOptions: CytoscapeOptions = {
			container: cyRef.current,
			style: [
				{
					selector: 'node',
					style: {
						'text-valign': 'center',
						content: 'data(label)',
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

						// @ts-expect-error Аннотация типов в библиотеки некорректна
						'transition-duration': '500ms',

						// @ts-expect-error Аннотация типов в библиотеки некорректна
						'transition-delay': '250ms',
					},
				},
				{
					selector: 'node.packet',
					style: {
						'background-color': 'red',
						height: 20,
						label: 'data(label)',
						width: 20,
					},
				},
			],
			elements: [...graphElements.nodes, ...graphElements.edges],
			layout: {
				name: 'grid',
				rows: 1,
				padding: 10,
			},
			panningEnabled: true,
			zoomingEnabled: true,
			minZoom: 0.05,
			zoom: 1,
			maxZoom: 2,
			selectionType: 'single',
		};

		// Инициализируем `cytoscape`
		cyInstanceRef.current = cytoscape(cyOptions);

		// Определяем опции для `edgehandles`
		const ehOptions: EdgeHandlesOptions = {
			edgeParams: (source: NodeSingular, target: NodeSingular) => ({
				data: {
					source: source.id(),
					target: target.id(),
					weight: Math.floor(Math.random() * 10 + 1),
				},
			}),

			canConnect: (source: NodeSingular, target: NodeSingular) => source.id() !== target.id(),

			snap: false,
		};

		// Инициализируем `edgehandles`
		ehInstanceRef.current = cyInstanceRef.current.edgehandles(ehOptions);

		// Определяем действие при выборе подсвеченного элемента
		cyInstanceRef.current.on('select', '.highlighted,node', () =>
			cyInstanceRef.current!.elements().removeClass('highlighted'),
		);

		// Определяем действие при выборе вершины
		cyInstanceRef.current.on('select', 'node', (event: EventObject) => {
			setSelectedGraphElements((previousSelectedGraphElements) => ({
				nodes: [...previousSelectedGraphElements.nodes, event.target as NodeSingular],
				edges: previousSelectedGraphElements.edges,
			}));
		});

		// Определяем действие при отмене выбора вершины
		cyInstanceRef.current.on('unselect', 'node', (event: EventObject) => {
			setSelectedGraphElements((previousSelectedGraphElements) => ({
				nodes: previousSelectedGraphElements.nodes.filter((node) => node.id() !== event.target.id()),
				edges: previousSelectedGraphElements.edges,
			}));
		});

		// Определяем действие при выборе ребра
		cyInstanceRef.current.on('select', 'edge', (event: EventObject) => {
			setSelectedGraphElements((previousSelectedGraphElements) => ({
				nodes: previousSelectedGraphElements.nodes,
				edges: [...previousSelectedGraphElements.edges, event.target as EdgeSingular],
			}));
		});

		// Определяем действие при отмене выбора ребра
		cyInstanceRef.current.on('unselect', 'edge', (event: EventObject) => {
			setSelectedGraphElements((previousSelectedGraphElements) => ({
				nodes: previousSelectedGraphElements.nodes.filter((node) => node.id() !== event.target.id()),
				edges: previousSelectedGraphElements.edges.filter((edge) => edge.id() !== event.target.id()),
			}));
		});

		return () => {
			cyInstanceRef.current?.destroy();
			ehInstanceRef.current?.destroy();
		};
	}, []);

	// Эффект при изменении элементов графа
	useEffect(() => {
		if (!cyInstanceRef.current) return console.warn('cyInstanceRef.current is null');

		// Удаляем все выбранные элементы текущего графа
		setSelectedGraphElements(() => ({ nodes: [], edges: [] }));

		// Удаляем все элементы текущего графа
		cyInstanceRef.current.elements().remove();

		// Добавляем новые элементы
		cyInstanceRef.current.add([...graphElements.nodes, ...graphElements.edges]);

		// Позиционируем элементы графа
		cyInstanceRef.current.layout({ name: 'circle' }).run();
	}, [graphElements]);

	return (
		<>
			<div
				ref={cyRef}
				style={{
					height: '100vh',
					width: '100vw',
				}}
			/>

			<GraphElementsContext.Provider
				value={{
					graphElements,
					setGraphElements,
					selectedGraphElements,
					setSelectedGraphElements,
				}}
			>
				<CyInstanceRefContext.Provider value={cyInstanceRef}>
					<EhInstanceRefContext.Provider value={ehInstanceRef}>
						<RoutingTableProvider>
							<ControlPanel />
							<RoutingTable />
							<AdjacencyMatrix />
						</RoutingTableProvider>
					</EhInstanceRefContext.Provider>
				</CyInstanceRefContext.Provider>
			</GraphElementsContext.Provider>
		</>
	);
};

export type { GraphElements };

export { CyInstanceRefContext, EhInstanceRefContext, GraphElementsContext };

export default CytoscapeGraph;
