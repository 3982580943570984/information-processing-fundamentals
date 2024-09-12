'use client';

import cytoscape, { Core, CytoscapeOptions, ElementDefinition, NodeSingular } from 'cytoscape';
import edgehandles, { EdgeHandlesInstance, EdgeHandlesOptions } from 'cytoscape-edgehandles';
import { createContext, MutableRefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ControlPanel from './control_panel';
import AdjacencyMatrix from './adjacency_matrix';

type GraphElements = {
	nodes: ElementDefinition[];
	edges: ElementDefinition[];
};

type GraphElementsState = {
	graphElements: GraphElements;
	setGraphElements: React.Dispatch<React.SetStateAction<GraphElements>>;
};

// TODO: move contexts to separate folder

const GraphElementsContext = createContext<GraphElementsState>({
	graphElements: { nodes: [], edges: [] },
	setGraphElements: () => {},
});

const CyInstanceRefContext = createContext<MutableRefObject<Core | null>>({ current: null });

const EhInstanceRefContext = createContext<MutableRefObject<EdgeHandlesInstance | null>>({ current: null });

const CytoscapeGraph: React.FC = () => {
	const [graphElements, setGraphElements] = useState<GraphElements>({
		nodes: [{ data: { id: 'n1' } }, { data: { id: 'n2' } }],
		edges: [{ data: { id: 'e1', source: 'n1', target: 'n2', weight: 3 } }],
	});

	const cyRef = useRef<HTMLDivElement>(null);
	const cyInstanceRef = useRef<Core | null>(null);
	const ehInstanceRef = useRef<EdgeHandlesInstance | null>(null);

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

						// @ts-expect-error Аннотация типов в библиотеки некорректна
						'transition-duration': '500ms',

						// @ts-expect-error Аннотация типов в библиотеки некорректна
						'transition-delay': '250ms',
					},
				},
			],
			elements: [...graphElements.nodes, ...graphElements.edges],
			layout: {
				name: 'grid',
				rows: 1,
				padding: 10,
			},
			panningEnabled: false,
			zoomingEnabled: false,
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
					weight: 123,
				},
			}),

			// TODO: prevent more than one edge between source and node
			canConnect: (source: NodeSingular, target: NodeSingular) => source.id() !== target.id(),

			snap: false,
		};

		// Инициализируем `edgehandles`
		ehInstanceRef.current = cyInstanceRef.current.edgehandles(ehOptions);

		return () => {
			cyInstanceRef.current?.destroy();
			ehInstanceRef.current?.destroy();
		};
	}, []);

	useEffect(() => {
		const cyInstance = cyInstanceRef.current;

		if (cyInstance == null) {
			return console.warn('cyInstanceRef.current is null');
		}

		// Удалаяем все элементы текущего графа
		cyInstance.elements().remove();

		// Добавляем новые элементы
		cyInstance.add([...graphElements.nodes, ...graphElements.edges]);

		// Позиционируем элементы графа
		cyInstance.layout({ name: 'circle' }).run();
	}, [graphElements]);

	return (
		<>
			<div
				ref={cyRef}
				style={{
					height: '100vh',
					width: '100wh',
				}}
			/>
			<GraphElementsContext.Provider value={{ graphElements, setGraphElements }}>
				<CyInstanceRefContext.Provider value={cyInstanceRef}>
					<EhInstanceRefContext.Provider value={ehInstanceRef}>
						<ControlPanel />
						<AdjacencyMatrix />
					</EhInstanceRefContext.Provider>
				</CyInstanceRefContext.Provider>
			</GraphElementsContext.Provider>
		</>
	);
};

export { GraphElementsContext, CyInstanceRefContext, EhInstanceRefContext };

export default CytoscapeGraph;
