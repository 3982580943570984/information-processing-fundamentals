'use client';

import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useContext, useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { RoutingTableContext } from '../contexts/routing_table';
import { CyInstanceRefContext } from './cytoscape_graph';

type RoutingTableRow = {
	router: string;
	[destination: string]: number | string;
};

const RoutingTable: React.FC = () => {
	const routingTableContext = useContext(RoutingTableContext);
	if (!routingTableContext) {
		throw new Error('RoutingTable must be used within a RoutingTableProvider');
	}
	const { routingTable } = routingTableContext;

	const cyInstanceRef = useContext(CyInstanceRefContext);

	const [data, setData] = useState<RoutingTableRow[]>([]);
	const [columns, setColumns] = useState<ColumnDef<RoutingTableRow>[]>([]);

	useEffect(() => {
		console.log(`Эффект для изменения отображения таблицы маршрутизации`);

		if (!cyInstanceRef.current) return;

		const routers = Array.from(routingTable.keys());

		const destinationsSet = new Set<string>();

		routingTable.forEach((destMap) => destMap.forEach((_, dest) => destinationsSet.add(dest)));

		const destinations = Array.from(destinationsSet);

		const destinationLabels = destinations.map((destination) =>
			cyInstanceRef.current!.getElementById(destination).data('label'),
		);

		destinationLabels.sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

		const tableColumns: ColumnDef<RoutingTableRow>[] = [
			{
				header: '',
				accessorKey: 'router',
				cell: (info) => cyInstanceRef.current!.getElementById(info.getValue() as string).data('label'),
			},
			...destinationLabels.map((destinationLabel) => ({
				header: destinationLabel,
				accessorKey: destinationLabel,
				cell: (info) => info.getValue() ?? '-',
			})),
		];

		const tableData: RoutingTableRow[] = routers.map((router) => {
			const row: RoutingTableRow = { router };
			const destMap = routingTable.get(router);

			if (destMap) {
				destinations.forEach((dest) => {
					const label = cyInstanceRef.current?.getElementById(dest)?.data('label') ?? dest;
					row[label] = destMap.get(dest) ?? '-';
				});
			}

			return row;
		});

		setColumns(tableColumns);
		setData(tableData);
	}, [routingTable, cyInstanceRef.current]);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<Rnd
			default={{
				x: 10,
				y: 390,
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
				<h3 style={{ margin: '10px 0 10px 0', textAlign: 'center' }}>Таблица маршрутизации</h3>
				<table
					style={{
						borderCollapse: 'collapse',
						width: '100%',
						color: '#fff',
						tableLayout: 'fixed',
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
											position: 'sticky',
											top: 0,
											zIndex: 1,
										}}
									>
										{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
											border: '1px solid #444',
											padding: '8px',
											textAlign: 'center',
											backgroundColor: cell.column.id === 'router' ? '#23272a' : '#2c2f33',
											wordWrap: 'break-word',
										}}
									>
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

export default RoutingTable;
