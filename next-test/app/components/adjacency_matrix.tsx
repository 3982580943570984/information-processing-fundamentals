'use client';

import { useState, useMemo, useContext, useEffect } from 'react';
import { useReactTable, getCoreRowModel, ColumnDef, flexRender } from '@tanstack/react-table';
import { GraphElementsContext } from './graph';

type MatrixCell = number;
type MatrixRow = MatrixCell[];

const AdjacencyMatrix: React.FC = () => {
	const { graphElements } = useContext(GraphElementsContext);

	const [size, setSize] = useState(graphElements.nodes.length);
	const [matrix, setMatrix] = useState<MatrixRow[]>(Array.from({ length: size }, () => Array(size).fill(0)));

	useEffect(() => {
		const newSize = graphElements.nodes.length;

		if (newSize !== size) {
			handleResize(newSize);
		}

		// Recompute the matrix based on edges
		const newMatrix = Array.from({ length: newSize }, () => Array(newSize).fill(0));
		graphElements.edges.forEach((edge) => {
			const sourceIndex = graphElements.nodes.findIndex((node) => node.data.id === edge.data.source);
			const targetIndex = graphElements.nodes.findIndex((node) => node.data.id === edge.data.target);
			if (sourceIndex !== -1 && targetIndex !== -1) {
				newMatrix[sourceIndex][targetIndex] = edge.data.weight;
			}
		});
		setMatrix(newMatrix);
	}, [graphElements, size]);

	// Update matrix size
	const handleResize = (newSize: number) => {
		const newMatrix = Array.from({ length: newSize }, (_, rowIndex) =>
			Array.from({ length: newSize }, (_, colIndex) =>
				rowIndex < matrix.length && colIndex < matrix[rowIndex].length ? matrix[rowIndex][colIndex] : 0,
			),
		);
		setMatrix(newMatrix);
		setSize(newSize);
	};

	// Define columns based on matrix size
	const columns = useMemo<ColumnDef<MatrixRow>[]>(
		() =>
			Array.from({ length: size }, (_, index) => ({
				header: `Col ${index + 1}`,
				accessorKey: String(index), // Use column index as accessor
				cell: ({ row, column }) => (
					<input
						type="number"
						value={row.original[parseInt(column.id, 10)]}
						onChange={(e) => {
							const value = parseInt(e.target.value, 10) || 0;
							const newMatrix = [...matrix];
							newMatrix[row.index][parseInt(column.id, 10)] = value;
							setMatrix(newMatrix);
						}}
						style={{ width: '100%', padding: '4px' }}
					/>
				),
			})),
		[size, matrix],
	);

	// Create table instance using TanStack Table's useReactTable hook
	const table = useReactTable({
		data: matrix,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<>
			{/* Input to change the size of the matrix */}
			<label>
				Matrix Size:
				<input
					type="number"
					value={size}
					onChange={(e) => handleResize(parseInt(e.target.value, 10))}
					min={1}
					style={{ marginBottom: '10px', padding: '4px' }}
				/>
			</label>

			{/* Render the table */}
			<table style={{ borderCollapse: 'collapse', marginTop: '10px' }}>
				<thead>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<th
									key={header.id}
									style={{
										border: '1px solid black',
										padding: '4px',
										textAlign: 'center',
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
							{row.getVisibleCells().map((cell) => (
								<td
									key={cell.id}
									style={{
										border: '1px solid black',
										padding: '4px',
										textAlign: 'center',
									}}
								>
									{cell.getValue<number>()}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</>
	);
};

export default AdjacencyMatrix;
