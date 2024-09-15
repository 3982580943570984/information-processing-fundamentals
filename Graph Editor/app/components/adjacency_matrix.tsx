'use client';

import { useState, useMemo, useContext, useEffect } from 'react';
import { useReactTable, getCoreRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import { GraphElementsContext } from './graph';
import { Rnd } from 'react-rnd';

type MatrixCell = number;
type MatrixRow = MatrixCell[];

const AdjacencyMatrix: React.FC = () => {
	const { graphElements, setGraphElements } = useContext(GraphElementsContext);
	const [size, setSize] = useState(graphElements.nodes.length);
	const [matrix, setMatrix] = useState<MatrixRow[]>(Array.from({ length: size }, () => Array(size).fill(0)));

	const columns = useMemo<ColumnDef<MatrixRow>[]>(
		() =>
			Array.from({ length: graphElements.nodes.length + 1 }, (_, index) => {
				if (index === 0) {
					return {
						header: ``,
						accessorKey: String(index),
					};
				}

				return {
					header: `n${index}`,
					accessorKey: String(index),
					cell: ({ row, column }) => {
						const [inputValue, setInputValue] = useState(row.original[parseInt(column.id, 10)]);

						return (
							<input
								type="text"
								value={inputValue}
								onChange={(e) => {
									const parsedInt = parseInt(e.target.value);

									if (isNaN(parsedInt) || !isFinite(parsedInt)) {
										setInputValue(0);
										return;
									}

									setInputValue(parsedInt);
								}}
								onBlur={() => {
									setGraphElements((previousGraphElements) => {
										let weight = inputValue;

										if (weight > 25) weight = 25;

										const source = previousGraphElements.nodes.find(
											(node) => node.data.label === `n${row.index + 1}`,
										);

										const target = previousGraphElements.nodes.find(
											(node) => node.data.label === `n${column.id}`,
										);

										const edge = previousGraphElements.edges.find(
											(edge) =>
												edge.data.source === source?.data.id &&
												edge.data.target === target?.data.id,
										);

										if (weight === 0) {
											return {
												nodes: previousGraphElements.nodes,
												edges: previousGraphElements.edges.filter((edge_) => edge_ !== edge),
											};
										}

										if (edge === undefined) {
											return {
												nodes: previousGraphElements.nodes,
												edges: [
													...previousGraphElements.edges,
													{
														data: {
															source: source?.data.id as string,
															target: target?.data.id as string,
															weight,
														},
													},
												],
											};
										}

										edge.data.weight = weight;

										return {
											nodes: previousGraphElements.nodes,
											edges: previousGraphElements.edges,
										};
									});
								}}
								style={{
									width: '50%',
									padding: '4px',
									textAlign: 'center',
									backgroundColor: '#2c2f33',
									color: '#fff',
									border: 'none',
									outline: 'none',
								}}
							/>
						);
					},
				};
			}),
		[matrix],
	);

	const table = useReactTable({
		data: matrix,
		columns: columns,
		getCoreRowModel: getCoreRowModel(),
	});

	// Эффект при изменении элементов графа
	useEffect(() => {
		console.log('Эффект при изменении элементов графа');

		// !!! отключить при потенциальном зацикливании !!!
		setSize(graphElements.nodes.length);

		setMatrix(() => {
			const nodes = graphElements.nodes;
			const numberOfNodes = nodes.length;
			const nodeIdToIndex = Object.fromEntries(nodes.map((node, index) => [node.data.id, index]));

			// Создаем новую матрицу и заполняем ее нулями
			const newMatrix = Array.from({ length: numberOfNodes }, () => Array(numberOfNodes + 1).fill(0));

			// Заполняем первую колонку числами от 1 до длины матрицы
			for (let i = 0; i < numberOfNodes; i++) {
				newMatrix[i][0] = `n${i + 1}`;
			}

			// Заполняем матрицу взвешенными ребрами
			graphElements.edges.forEach((edge) => {
				const sourceIndex = nodeIdToIndex[edge.data.source];
				const targetIndex = nodeIdToIndex[edge.data.target];
				if (sourceIndex !== undefined && targetIndex !== undefined) {
					newMatrix[sourceIndex][targetIndex + 1] = edge.data.weight;
				}
			});

			return newMatrix;
		});
	}, [graphElements]);

	// Эффект при изменении размера матрицы
	useEffect(() => {
		console.log('Эффект при изменении размера матрицы');

		setGraphElements((previousGraphElements) => {
			const currentNodes = previousGraphElements.nodes;
			const previousSize = previousGraphElements.nodes.length;

			if (size > previousSize) {
				const newNodes = Array.from({ length: size - previousSize }, (_, i) => ({
					data: { label: `n${previousSize + i + 1}` },
				}));

				return {
					edges: previousGraphElements.edges,
					nodes: [...currentNodes, ...newNodes],
				};
			}

			if (size < previousSize) {
				const newNodes = currentNodes.slice(0, size);
				const newNodeIds = newNodes.map((node) => node.data.id);

				return {
					edges: previousGraphElements.edges.filter(
						(edge) => newNodeIds.includes(edge.data.source) && newNodeIds.includes(edge.data.target),
					),
					nodes: newNodes,
				};
			}

			return previousGraphElements;
		});
	}, [size]);

	return (
		<Rnd
			default={{
				x: 10,
				y: 10,
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
						marginLeft: '10px',
						marginBottom: '10px',
						fontWeight: 'bold',
						color: 'white',
					}}
				>
					Количество вершин:
					<input
						type="text"
						value={size}
						onChange={(e) => {
							let parsedInt = parseInt(e.target.value, 10);

							if (isNaN(parsedInt) || !isFinite(parsedInt)) return;

							if (parsedInt <= 0) parsedInt = 1;

							setSize(parsedInt);
						}}
						min={1}
						inputMode="numeric"
						style={{
							marginLeft: '10px',
							padding: '4px',
							width: '40px',
							backgroundColor: '#23272a',
							color: '#fff',
							border: '1px solid #444',
							borderRadius: '4px',
						}}
					/>
				</label>

				<table
					style={{
						borderCollapse: 'collapse',
						marginTop: '10px',
						width: '100%',
						color: '#fff',
						flexGrow: 1,
					}}
				>
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										style={{
											border: '1px solid #444',
											padding: '8px',
											textAlign: 'center',
											backgroundColor: '#23272a',
										}}
									>
										{header.isPlaceholder
											? null
											: flexRender(header.column.columnDef.header, header.getContext())}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.map((row) => (
							<tr key={row.id}>
								{row.getVisibleCells().map((cell, cellIndex) => (
									<td
										key={cell.id}
										style={{
											border: '1px solid #444',
											// padding: '8px',
											textAlign: 'center',
											backgroundColor: cellIndex === 0 ? '#23272a' : '#2c2f33',
										}}
									>
										{/* {cell.getValue<number>()} */}
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Rnd>
	);
};

export default AdjacencyMatrix;
