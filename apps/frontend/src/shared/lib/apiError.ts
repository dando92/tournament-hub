export function apiErrorMessage(error: unknown, fallback: string): string {
    return (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (error instanceof Error ? error.message : fallback);
}

export function apiErrorDetail(error: unknown): string | undefined {
    return (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export function apiErrorMessages(error: unknown, fallback: string): string[] {
    const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
    if (Array.isArray(message)) {
        return message;
    }

    return [message ?? (error instanceof Error ? error.message : fallback)];
}
