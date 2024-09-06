import cytoscape, { Core, CytoscapeOptions, EdgeCollection, EdgeDataDefinition, ElementDefinition, NodeCollection, NodeDataDefinition, NodeSingular } from 'cytoscape';
import * as dat from 'dat.gui'

const container: HTMLDivElement = document.getElementById('cy') as HTMLDivElement

const cytoscapeOptions: CytoscapeOptions = {
    container: container,
    elements: [
        { data: { id: 'n1' } },
        { data: { id: 'n2' } },
        { data: { id: 'e1', source: 'n1', target: 'n2' } }
    ],
    layout: {
        name: 'grid',
        rows: 1
    },
    panningEnabled: false,
    zoomingEnabled: false,
    selectionType: 'single',
}

const cy: Core = cytoscape(cytoscapeOptions);

const controls = {
    addNode: () => {
        const id = `n${cy.nodes().length + 1}`;

        const nodeDataDefinition: NodeDataDefinition = {
            id: id,
        }

        const elementDefinition: ElementDefinition = {
            data: nodeDataDefinition,
        }

        cy.add(elementDefinition);

        cy.layout({ name: 'grid' }).run();
    },
    removeNode: () => {
        const selectedNodes: NodeCollection = cy.nodes(':selected');
        if (selectedNodes.length === 0) {
            return alert('Please select a node to remove.');
        }

        cy.remove(selectedNodes);
    },
    addEdge: () => {
        const selectedNodes: NodeCollection = cy.nodes(':selected');
        if (selectedNodes.length !== 2) {
            return alert('Please select exactly two nodes to create an edge.');
        }

        const sourceNode = selectedNodes.first() as NodeSingular;
        const targetNode = selectedNodes.last() as NodeSingular;

        const edgeAlreadyExists = sourceNode.edgesWith(targetNode).nonempty()
        if (edgeAlreadyExists) {
            return alert('An edge already exists between these nodes.')
        }

        const id = `e${cy.edges().length + 1}`;

        const edgeDataDefinition: EdgeDataDefinition = {
            id: id,
            source: sourceNode.id(),
            target: targetNode.id()
        };

        const elementDataDefinition: ElementDefinition = {
            data: edgeDataDefinition
        }

        cy.add(elementDataDefinition);
    },
    removeEdge: () => {
        const selectedEdges: EdgeCollection = cy.edges(':selected');

        if (selectedEdges.length === 0) {
            return alert('Please select an edge to remove.');
        }

        cy.remove(selectedEdges);
    }
}

const gui: dat.GUI = new dat.GUI();

const nodesFolder: dat.GUI = gui.addFolder('Nodes')
nodesFolder.add(controls, 'addNode').name('Add Node');
nodesFolder.add(controls, 'removeNode').name('Remove Node');

const edgesFolder: dat.GUI = gui.addFolder('Edges')
edgesFolder.add(controls, 'addEdge').name('Add Edge');
edgesFolder.add(controls, 'removeEdge').name('Remove Edge');