import MatrixTable from './components/adjacency_matrix';
import ControlPanel from './components/control_panel';
import Graph from './components/graph';

export const metadata = {
	title: 'Root page',
};

const Root: React.FC = () => (
	<>
		{/* <Graph />
		<ControlPanel /> */}
		<MatrixTable />
	</>
);

export default Root;
