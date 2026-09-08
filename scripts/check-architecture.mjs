import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const errors = [];
const apps = ['api', 'migrations', 'realtime', 'frontend'];
const libraryWorkspaces = new Set([
    'packages/scoring',
    'packages/brackets',
    'packages/contracts',
    'packages/persistence',
    'packages/live-messaging',
    'packages/startgg',
]);
const staticWorkspaces = new Set(['apps/frontend']);

const prettierConfigPath = join(root, '.prettierrc.json');
if (!existsSync(prettierConfigPath)) {
    errors.push('the repository-root Prettier configuration is required');
} else {
    const prettierConfig = JSON.parse(readFileSync(prettierConfigPath, 'utf8'));
    const expectedPrettierConfig = {
        printWidth: 160,
        tabWidth: 4,
        useTabs: false,
        semi: true,
        singleQuote: true,
        trailingComma: 'all',
    };
    if (JSON.stringify(prettierConfig) !== JSON.stringify(expectedPrettierConfig)) {
        errors.push('the repository-root Prettier configuration must keep the approved standard defaults');
    }
}

if (existsSync(join(root, 'apps', 'api', '.prettierrc'))) {
    errors.push('workspace-specific Prettier overrides are forbidden');
}

function filesBelow(directory) {
    if (!existsSync(directory)) {
        return [];
    }
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') {
            return [];
        }
        const path = join(directory, entry.name);
        return entry.isDirectory() ? filesBelow(path) : [path];
    });
}

function packageJson(path) {
    return JSON.parse(readFileSync(join(root, path, 'package.json'), 'utf8'));
}

function internalDependencies(pkg) {
    return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).filter((name) => name.startsWith('@tournament-hub/'));
}

for (const app of apps) {
    for (const directory of ['src', 'tests']) {
        if (!existsSync(join(root, 'apps', app, directory))) {
            errors.push(`apps/${app}/${directory} is required`);
        }
    }
    const nestedTests = filesBelow(join(root, 'apps', app, 'src')).filter((path) => /\.(spec|test)\.[cm]?[jt]sx?$/.test(path));
    for (const path of nestedTests) {
        errors.push(`app test must be under sibling tests/: ${relative(root, path)}`);
    }
}

for (const path of filesBelow(join(root, 'apps', 'api', 'src'))) {
    const source = readFileSync(path, 'utf8');
    if (/from\s+['"]@tournament\/dtos['"]/.test(source)) {
        errors.push(`API request DTO barrel import is forbidden: ${relative(root, path)}`);
    }
    if (/from\s+['"]@auth\/(?:guards|strategies)['"]/.test(source)) {
        errors.push(`API auth barrel import is forbidden: ${relative(root, path)}`);
    }
}

for (const path of filesBelow(join(root, 'apps', 'frontend', 'src'))) {
    const source = readFileSync(path, 'utf8');
    const normalized = relative(join(root, 'apps', 'frontend', 'src'), path).replaceAll('\\', '/');
    if (/from\s+['"]axios['"]/.test(source) && normalized !== 'app/providers.tsx' && !/^features\/[^/]+\/api\//.test(normalized)) {
        errors.push(`frontend axios import must live in a feature API module: ${relative(root, path)}`);
    }
}

const allowedDependencies = new Map([
    ['@tournament-hub/contracts', ['@tournament-hub/scoring']],
    ['@tournament-hub/scoring', []],
    ['@tournament-hub/brackets', []],
    ['@tournament-hub/persistence', ['@tournament-hub/scoring']],
    ['@tournament-hub/live-messaging', ['@tournament-hub/contracts']],
    ['@tournament-hub/startgg', []],
    ['@tournament-hub/migrations', ['@tournament-hub/persistence']],
    [
        '@tournament-hub/api',
        [
            '@tournament-hub/scoring',
            '@tournament-hub/brackets',
            '@tournament-hub/contracts',
            '@tournament-hub/live-messaging',
            '@tournament-hub/persistence',
            '@tournament-hub/startgg',
        ],
    ],
    // Realtime carries invalidations it never has to understand, so it needs
    // the envelope and no domain vocabulary at all.
    ['@tournament-hub/realtime', ['@tournament-hub/live-messaging']],
    ['@tournament-hub/frontend', ['@tournament-hub/contracts', '@tournament-hub/brackets']],
]);

for (const workspace of [
    'packages/contracts',
    'packages/scoring',
    'packages/brackets',
    'packages/persistence',
    'packages/live-messaging',
    'packages/startgg',
    ...apps.map((app) => `apps/${app}`),
]) {
    const pkg = packageJson(workspace);
    const allowed = new Set(allowedDependencies.get(pkg.name) ?? []);
    for (const dependency of internalDependencies(pkg)) {
        if (!allowed.has(dependency)) {
            errors.push(`${pkg.name} must not depend on ${dependency}`);
        }
    }
}

// Every image is a target of the repository-root Dockerfile, which installs
// dependencies and builds the monorepo once in stages the targets share. What
// the Dockerfile still names by hand is the set of workspaces it copies, so a
// workspace added and forgotten there would produce an image that cannot
// install or cannot resolve a package at runtime.
const dockerfilePath = join(root, 'Dockerfile');
if (!existsSync(dockerfilePath)) {
    errors.push('the repository-root Dockerfile is required');
} else {
    const dockerfile = readFileSync(dockerfilePath, 'utf8');
    const rootWorkspaces = packageJson('.').workspaces;

    for (const directory of rootWorkspaces) {
        if (!dockerfile.includes(`COPY ${directory}/package.json ${directory}/package.json`)) {
            errors.push(`the root Dockerfile must copy ${directory}/package.json into the manifest stage`);
        }
    }

    for (const directory of rootWorkspaces) {
        const isPackage = libraryWorkspaces.has(directory);
        const target = directory.split('/')[1];
        const output = staticWorkspaces.has(directory)
            ? `COPY --from=build /app/${directory}/dist /usr/share/nginx/html`
            : `COPY --from=build /app/${directory}/dist ${directory}/dist`;

        if (!dockerfile.includes(output)) {
            errors.push(
                isPackage
                    ? `the root Dockerfile must copy ${directory}/dist into the shared runtime stage`
                    : `the ${target} image target must copy the ${directory} build output`,
            );
        }
        if (isPackage) {
            continue;
        }
        if (!new RegExp(`^FROM .+ AS ${target}$`, 'm').test(dockerfile)) {
            errors.push(`the root Dockerfile must define the ${target} image target`);
        }
    }
}

const localCompose = readFileSync(join(root, 'docker-compose.yml'), 'utf8');
for (const app of apps) {
    if (!localCompose.includes(`target: ${app}`)) {
        errors.push(`local Compose must build the ${app} target of the root Dockerfile`);
    }
}
if (/^\s+dockerfile: (?!Dockerfile$)/m.test(localCompose)) {
    errors.push('local Compose services must build targets of the root Dockerfile');
}

for (const path of [
    ...filesBelow(join(root, 'packages', 'contracts', 'src')),
    ...filesBelow(join(root, 'packages', 'scoring', 'src')),
    ...filesBelow(join(root, 'packages', 'brackets', 'src')),
]) {
    const source = readFileSync(path, 'utf8');
    if (/from\s+['"](?:typeorm|redis|@nestjs\/)/.test(source)) {
        errors.push(`domain contract/application code imports infrastructure: ${relative(root, path)}`);
    }
}

for (const app of apps) {
    for (const path of filesBelow(join(root, 'apps', app, 'src'))) {
        const source = readFileSync(path, 'utf8');
        for (const other of apps.filter((candidate) => candidate !== app)) {
            if (source.includes(`@${other}/`) || source.includes(`apps/${other}/src`)) {
                errors.push(`cross-app source import in ${relative(root, path)}: ${other}`);
            }
        }
    }
}

if (errors.length > 0) {
    console.error(errors.map((error) => `- ${error}`).join('\n'));
    process.exit(1);
}

console.log('Architecture boundaries verified.');
