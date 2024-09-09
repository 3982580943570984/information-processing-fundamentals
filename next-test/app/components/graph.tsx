'use client';

import cytoscape from 'cytoscape';
import edgehandles from 'cytoscape-edgehandles';
import { useEffect, useRef } from 'react';

const Graph: React.FC = () => {
	const cyRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		cytoscape.use(edgehandles);

		cytoscape({
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
		});
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
