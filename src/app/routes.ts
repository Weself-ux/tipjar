import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	type RouteConfigEntry,
	index,
	route,
} from '@react-router/dev/routes';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

type Tree = {
	path: string;
	children: Tree[];
	hasPage: boolean;
	hasRoute: boolean;
	isParam: boolean;
	paramName: string;
	isCatchAll: boolean;
};

function buildRouteTree(dir: string, basePath = ''): Tree {
	const files = readdirSync(dir);
	const node: Tree = {
		path: basePath,
		children: [],
		hasPage: false,
		hasRoute: false,
		isParam: false,
		isCatchAll: false,
		paramName: '',
	};

	const dirName = basePath.split('/').pop();
	if (dirName?.startsWith('[') && dirName.endsWith(']')) {
		node.isParam = true;
		const paramName = dirName.slice(1, -1);
		if (paramName.startsWith('...')) {
			node.isCatchAll = true;
			node.paramName = paramName.slice(3);
		} else {
			node.paramName = paramName;
		}
	}

	for (const file of files) {
		const filePath = join(dir, file);
		const stat = statSync(filePath);

		if (stat.isDirectory()) {
			const childPath = basePath ? `${basePath}/${file}` : file;
			const childNode = buildRouteTree(filePath, childPath);
			node.children.push(childNode);
		} else if (file === 'page.jsx') {
			node.hasPage = true;
		} else if (file === 'route.js') {
			node.hasRoute = true;
		}
	}

	return node;
}

function processPath(routePath: string): string {
	const segments = routePath.split('/');
	return segments.map((segment) => {
		if (segment.startsWith('[') && segment.endsWith(']')) {
			const paramName = segment.slice(1, -1);
			if (paramName.startsWith('...')) return '*';
			if (paramName.startsWith('[') && paramName.endsWith(']')) return `:${paramName.slice(1, -1)}?`;
			return `:${paramName}`;
		}
		return segment;
	}).join('/');
}

function generateRoutes(node: Tree): RouteConfigEntry[] {
	const routes: RouteConfigEntry[] = [];

	if (node.hasPage) {
		const componentPath =
			node.path === '' ? `./${node.path}page.jsx` : `./${node.path}/page.jsx`;

		if (node.path === '') {
			routes.push(index(componentPath));
		} else {
			const routePath = processPath(node.path);
			routes.push(route(routePath, componentPath));
		}
	}

	if (node.hasRoute && node.path !== '') {
		const componentPath = `./${node.path}/route.js`;
		const routePath = processPath(node.path);
		routes.push(route(routePath, componentPath));
	}

	for (const child of node.children) {
		routes.push(...generateRoutes(child));
	}

	return routes;
}

if (import.meta.env.DEV) {
	import.meta.glob('./**/page.jsx', {});
	import.meta.glob('./**/route.js', {});
	if (import.meta.hot) {
		import.meta.hot.accept((newSelf) => {
			import.meta.hot?.invalidate();
		});
	}
}

const tree = buildRouteTree(__dirname);
const notFound = route('*?', './__create/not-found.tsx');
const routes = [...generateRoutes(tree), notFound];

export default routes;