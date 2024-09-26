import { createContext, useContext, useEffect, useState } from 'react';
import { GraphElementsContext, CyInstanceRefContext } from '../components/cytoscape_graph';

type RoutingTable = Map<string, Map<string, number>>;

type RoutingTableContextType = {
	routingTable: RoutingTable;
	updateRoutingTable: (routerId: string, destinationId: string, hops: number) => void;
};

const RoutingTableContext = createContext<RoutingTableContextType | undefined>(undefined);

const RoutingTableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { graphElements } = useContext(GraphElementsContext);

	const cyInstanceRef = useContext(CyInstanceRefContext);

	const [routingTable, setRoutingTable] = useState<RoutingTable>(
		new Map([
			[
				'n1',
				new Map([
					['n1', 0],
					['n2', 1],
				]),
			],
			['n2', new Map([['n2', 0]])],
		]),
	);

	useEffect(() => {
		console.log('Эффект для изменения таблицы маршрутизации');

		if (!cyInstanceRef.current) return;

		setRoutingTable(() => {
			const newTable = new Map<string, Map<string, number>>();

			cyInstanceRef.current!.nodes().forEach((node) => {
				newTable.set(node.id(), new Map([[node.id(), 0]]));

				node
					.connectedEdges()
					.targets()
					.filter((neighbor) => node.id() !== neighbor.id())
					.forEach((neighbor) => {
						newTable.get(node.id())?.set(neighbor.id(), 1);
					});
			});

			return newTable;
		});
	}, [graphElements]);

	const updateRoutingTable = (routerId: string, destinationId: string, hops: number) => {
		setRoutingTable((previousRoutingTable) => {
			const newTable = new Map(previousRoutingTable);
			const routerTable = newTable.get(routerId) || new Map();
			const existingHops = routerTable.get(destinationId);

			if (existingHops === undefined || hops < existingHops) {
				routerTable.set(destinationId, hops);
				newTable.set(routerId, routerTable);
			}

			return newTable;
		});
	};

	return <RoutingTableContext.Provider value={{ routingTable, updateRoutingTable }} children={children} />;
};

export { RoutingTableContext, RoutingTableProvider };
