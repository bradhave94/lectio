"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { LogReadingDialog } from "./LogReadingDialog";
import { LogReadingFab } from "./LogReadingFab";

interface LogReadingContextValue {
	openLogReading: (options?: { planId?: string; planBookId?: string }) => void;
	closeLogReading: () => void;
}

const LogReadingContext = createContext<LogReadingContextValue | null>(null);

interface LogReadingProviderProps {
	children: ReactNode;
}

export function LogReadingProvider({ children }: LogReadingProviderProps) {
	const [open, setOpen] = useState(false);
	const [defaults, setDefaults] = useState<{ planId?: string; planBookId?: string }>({});

	const openLogReading = useCallback((options?: { planId?: string; planBookId?: string }) => {
		setDefaults({ planId: options?.planId, planBookId: options?.planBookId });
		setOpen(true);
	}, []);

	const closeLogReading = useCallback(() => {
		setOpen(false);
	}, []);

	const value = useMemo<LogReadingContextValue>(
		() => ({ openLogReading, closeLogReading }),
		[openLogReading, closeLogReading],
	);

	return (
		<LogReadingContext.Provider value={value}>
			{children}
			<LogReadingDialog
				open={open}
				onOpenChange={setOpen}
				defaultPlanId={defaults.planId}
				defaultPlanBookId={defaults.planBookId}
			/>
			<LogReadingFab hidden={open} />
		</LogReadingContext.Provider>
	);
}

export function useLogReading(): LogReadingContextValue {
	const context = useContext(LogReadingContext);
	if (!context) {
		throw new Error("useLogReading must be used within a LogReadingProvider");
	}
	return context;
}
