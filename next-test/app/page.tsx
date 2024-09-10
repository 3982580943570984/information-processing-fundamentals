import ControlPanel from './components/control_panel';
import Graph from './components/graph';

export const metadata = {
	title: 'Root page',
};

const Root: React.FC = () => (
	<div>
		<Graph />
		<ControlPanel />
	</div>
);

export default Root;
