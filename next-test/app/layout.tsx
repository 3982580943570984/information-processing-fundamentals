export const metadata = {
	title: 'Root page layout',
};

const RootLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	return (
		<html
			lang="en"
			style={{
				margin: 0,
				padding: 0,
				height: '100%',
				overflow: 'hidden',
			}}
		>
			<body
				style={{
					margin: 0,
					padding: 0,
					height: '100%',
					overflow: 'hidden',
				}}
			>
				{children}
			</body>
		</html>
	);
};

export default RootLayout;
