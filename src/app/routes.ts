import {
  type RouteConfigEntry,
  index,
  route,
} from '@react-router/dev/routes';

const pageModules = import.meta.glob('./**/page.jsx');
const routeModules = import.meta.glob('./**/route.js');

function convertPath(filePath: string, isPage: boolean): string {
  const suffix = isPage ? '/page.jsx' : '/route.js';
  let routePath = filePath
    .replace('./', '')
    .replace(suffix, '')
    .replace('page.jsx', '');
  routePath = routePath.replace(/\[\.\.\.([^\]]+)\]/g, '*');
  routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1');
  return routePath;
}

function generateRoutes(): RouteConfigEntry[] {
  const routes: RouteConfigEntry[] = [];

  for (const filePath of Object.keys(pageModules)) {
    const routePath = convertPath(filePath, true);
    if (routePath === '' || routePath === '/') {
      routes.push(index(filePath));
    } else {
      routes.push(route(routePath, filePath));
    }
  }

  for (const filePath of Object.keys(routeModules)) {
    const routePath = convertPath(filePath, false);
    if (routePath) {
      routes.push(route(routePath, filePath));
    }
  }

  return routes;
}

const notFound = route('*?', './__create/not-found.tsx');
export default [...generateRoutes(), notFound];