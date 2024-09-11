'use client';

import cytoscape, { Core, CytoscapeOptions, NodeSingular } from 'cytoscape';
import edgehandles, { EdgeHandlesInstance, EdgeHandlesOptions } from 'cytoscape-edgehandles';
import { useEffect, useRef } from 'react';

const Graph: React.FC = () => {
	const cyRef = useRef<HTMLDivElement>(null);
	const cyInstanceRef = useRef<Core | null>(null);
	const ehInstanceRef = useRef<EdgeHandlesInstance | null>(null);

	useEffect(() => {
		cytoscape.use(edgehandles);

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

		// Инициализируем `cytoscape`
		cyInstanceRef.current = cytoscape(cyOptions);

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
	});

	return (
		<div
			ref={cyRef}
			style={{
				height: '100vh',
				width: '100wh',
			}}
		/>
	);
};

export default Graph;
