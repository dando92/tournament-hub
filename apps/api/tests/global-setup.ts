const PG_CONCURRENT_QUERY_WARNING = "Calling client.query() when the client is already executing a query is deprecated";

export default async function suppressKnownWarnings(): Promise<void> {
    const emitWarning = process.emitWarning.bind(process) as (...args: unknown[]) => void;

    process.emitWarning = ((warning: string | Error, ...rest: unknown[]): void => {
        const message = typeof warning === "string" ? warning : warning.message;
        if (message.startsWith(PG_CONCURRENT_QUERY_WARNING)) {
            return;
        }
        emitWarning(warning, ...rest);
    }) as typeof process.emitWarning;
}
