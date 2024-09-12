'use client';

import { button, useControls } from 'leva';
import { useContext, useState } from 'react';
import { EhInstanceRefContext, GraphElementsContext } from './graph';

const ControlPanel: React.FC = () => {
	const [, setDrawMode] = useState(false);

	const { setGraphElements } = useContext(GraphElementsContext);

	const ehInstanceRef = useContext(EhInstanceRefContext);

	// TODO: provide interseting graphs
	useControls('Примеры графов', {
		Simple: button(() => {
			setGraphElements(() => ({
				nodes: [{ data: { id: 'n1' } }, { data: { id: 'n2' } }, { data: { id: 'n3' } }],
				edges: [
					{ data: { id: 'e1', source: 'n1', target: 'n2', weight: 3 } },
					{ data: { id: 'e2', source: 'n2', target: 'n3', weight: 5 } },
				],
			}));
		}),
		Medium: button(() => {
			setGraphElements(() => ({
				nodes: [{ data: { id: 'n1' } }, { data: { id: 'n2' } }, { data: { id: 'n3' } }, { data: { id: 'n4' } }],
				edges: [
					{ data: { id: 'e1', source: 'n1', target: 'n2', weight: 3 } },
					{ data: { id: 'e2', source: 'n2', target: 'n3', weight: 5 } },
					{ data: { id: 'e3', source: 'n4', target: 'n3', weight: 4 } },
					{ data: { id: 'e4', source: 'n4', target: 'n2', weight: 2 } },
				],
			}));
		}),
		Complex: button(() => {
			setGraphElements(() => ({
				nodes: [
					{ data: { id: 'n1' } },
					{ data: { id: 'n2' } },
					{ data: { id: 'n3' } },
					{ data: { id: 'n4' } },
					{ data: { id: 'n5' } },
					{ data: { id: 'n6' } },
					{ data: { id: 'n7' } },
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
	});

	// TODO: fix problem with unmoving nodes
	useControls({
		toggleDrawMode: button(() => {
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
	});

	return null;
};

export default ControlPanel;
