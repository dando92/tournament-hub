import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { availableParallelism, totalmem } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();

const memoryBudget = Math.max(1, Math.floor(totalmem() / (1.5 * 1024 ** 3)));
const concurrency = Number(process.env.BUILD_CONCURRENCY) || Math.min(availableParallelism(), memoryBudget);

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
const commandPrefix = npmCli ? [npmCli] : [];

function manifest(directory) {
    return JSON.parse(readFileSync(join(root, directory, 'package.json'), 'utf8'));
}

const workspaces = manifest('.').workspaces.map((directory) => {
    const pkg = manifest(directory);
    return {
        directory,
        name: pkg.name,
        buildable: Boolean(pkg.scripts?.build),
        dependencies: Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }),
    };
});

const internalNames = new Set(workspaces.map((workspace) => workspace.name));
for (const workspace of workspaces) {
    workspace.dependencies = workspace.dependencies.filter((dependency) => internalNames.has(dependency));
}

const pending = new Map(workspaces.filter((workspace) => workspace.buildable).map((workspace) => [workspace.name, workspace]));
const built = new Set(workspaces.filter((workspace) => !workspace.buildable).map((workspace) => workspace.name));

function build(workspace) {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const options = { cwd: root, shell: !npmCli && process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 };
        const args = [...commandPrefix, 'run', 'build', `--workspace=${workspace.name}`];
        execFile(command, args, options, (error, stdout, stderr) => {
            const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
            if (error) {
                process.stdout.write(`\n${workspace.name} failed after ${seconds}s\n${stdout}${stderr}\n`);
                reject(error);
                return;
            }
            process.stdout.write(`built ${workspace.name} in ${seconds}s\n`);
            resolve();
        });
    });
}

let running = 0;
let failure = null;

await new Promise((resolve) => {
    function pump() {
        if (!failure) {
            for (const workspace of [...pending.values()]) {
                if (running >= concurrency) {
                    break;
                }
                if (!workspace.dependencies.every((dependency) => built.has(dependency))) {
                    continue;
                }
                pending.delete(workspace.name);
                running += 1;
                build(workspace).then(
                    () => {
                        built.add(workspace.name);
                        running -= 1;
                        pump();
                    },
                    (error) => {
                        failure ??= error;
                        running -= 1;
                        pump();
                    },
                );
            }
        }
        if (running > 0) {
            return;
        }
        if (!failure && pending.size > 0) {
            failure = new Error(`internal dependency cycle blocks: ${[...pending.keys()].join(', ')}`);
        }
        resolve();
    }
    pump();
});

if (failure) {
    console.error(failure.message);
    process.exit(1);
}
