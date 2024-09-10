'use client';

import { useControls } from 'leva';

const ControlPanel: React.FC = () => {
	const { name, aNumber } = useControls({ name: 'World', aNumber: 0 });

	return (
		<div>
			Hey {name}, hello! {aNumber}
		</div>
	);
};

export default ControlPanel;
